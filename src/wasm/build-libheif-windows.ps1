# PowerShell script to build libheif for WebAssembly on Windows

Write-Host "Starting libheif WebAssembly build process..." -ForegroundColor Green

# Configuration
$LIBHEIF_VERSION = "1.17.6"
$BUILD_DIR = "$PWD\build"
$OUTPUT_DIR = "$PWD\dist"
$EMSDK_PATH = "$PWD\emsdk"

# Create directories
New-Item -ItemType Directory -Force -Path $BUILD_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $OUTPUT_DIR | Out-Null

# Install Emscripten if not already installed
if (!(Test-Path $EMSDK_PATH)) {
    Write-Host "Installing Emscripten..." -ForegroundColor Yellow
    git clone https://github.com/emscripten-core/emsdk.git $EMSDK_PATH
    Set-Location $EMSDK_PATH
    & "C:\Users\deeps\anaconda3\python.exe" emsdk.py install latest
    & "C:\Users\deeps\anaconda3\python.exe" emsdk.py activate latest
    Set-Location -
}

# Activate Emscripten
Write-Host "Activating Emscripten..." -ForegroundColor Yellow
& "$EMSDK_PATH\emsdk_env.ps1"

# Download libheif
Set-Location $BUILD_DIR
$tarFile = "libheif-$LIBHEIF_VERSION.tar.gz"
if (!(Test-Path $tarFile)) {
    Write-Host "Downloading libheif v$LIBHEIF_VERSION..." -ForegroundColor Yellow
    $url = "https://github.com/strukturag/libheif/releases/download/v$LIBHEIF_VERSION/libheif-$LIBHEIF_VERSION.tar.gz"
    Invoke-WebRequest -Uri $url -OutFile $tarFile
}

# Extract using Windows tar
if (!(Test-Path "libheif-$LIBHEIF_VERSION")) {
    Write-Host "Extracting libheif..." -ForegroundColor Yellow
    & "C:\Windows\System32\tar.exe" -xzf $tarFile
}

Set-Location "libheif-$LIBHEIF_VERSION"

# Configure for WebAssembly
Write-Host "Configuring build for WebAssembly..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path build-wasm | Out-Null
Set-Location build-wasm

# Configure for WebAssembly using cmd to run batch files
& C:\Windows\System32\cmd.exe /c "$EMSDK_PATH\upstream\emscripten\emcmake.bat" cmake .. -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=OFF -DWITH_EXAMPLES=OFF -DWITH_LIBDE265=ON -DWITH_X265=OFF -DWITH_AOM_DECODER=OFF -DWITH_AOM_ENCODER=OFF -DENABLE_MULTITHREADING_SUPPORT=OFF -DCMAKE_C_FLAGS="-O3 -flto" -DCMAKE_CXX_FLAGS="-O3 -flto"

# Build
Write-Host "Building libheif..." -ForegroundColor Yellow
& C:\Windows\System32\cmd.exe /c "$EMSDK_PATH\upstream\emscripten\emmake.bat" make -j$env:NUMBER_OF_PROCESSORS

# Create the final WASM module
Write-Host "Creating optimized WASM module..." -ForegroundColor Yellow
& C:\Windows\System32\cmd.exe /c "$EMSDK_PATH\upstream\emscripten\emcc.bat" `
    libheif/libheif.a `
    libde265/libde265.a `
    -O3 `
    -flto `
    -s WASM=1 `
    -s MODULARIZE=1 `
    -s EXPORT_NAME="LibHeif" `
    -s EXPORTED_FUNCTIONS='["_heif_context_alloc","_heif_context_free","_heif_context_read_from_memory","_heif_context_get_number_of_top_level_images","_heif_context_get_primary_image_handle","_heif_context_get_image_handle","_heif_image_handle_decode_image","_heif_image_get_width","_heif_image_get_height","_heif_image_get_plane","_malloc","_free"]' `
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8","HEAP8","HEAP16","HEAP32","allocate","intArrayFromString","ALLOC_NORMAL"]' `
    -s ALLOW_MEMORY_GROWTH=1 `
    -s MAXIMUM_MEMORY=2GB `
    -s TOTAL_MEMORY=64MB `
    -s NO_EXIT_RUNTIME=1 `
    -s NO_FILESYSTEM=1 `
    -s ENVIRONMENT='web,worker' `
    -o "$OUTPUT_DIR\libheif.js"

Write-Host "Build complete! Output files in $OUTPUT_DIR" -ForegroundColor Green
Write-Host "Generated files:" -ForegroundColor Green
Write-Host "  - libheif.js"
Write-Host "  - libheif.wasm"