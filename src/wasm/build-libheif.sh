#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting libheif WebAssembly build process...${NC}"

# Configuration
LIBHEIF_VERSION="1.17.6"
BUILD_DIR="$(pwd)/build"
OUTPUT_DIR="$(pwd)/dist"
EMSDK_PATH="$(pwd)/emsdk"

# Create directories
mkdir -p $BUILD_DIR
mkdir -p $OUTPUT_DIR

# Install Emscripten if not already installed
if [ ! -d "$EMSDK_PATH" ]; then
    echo -e "${YELLOW}Installing Emscripten...${NC}"
    git clone https://github.com/emscripten-core/emsdk.git $EMSDK_PATH
    cd $EMSDK_PATH
    ./emsdk install latest
    ./emsdk activate latest
    cd -
fi

# Activate Emscripten
echo -e "${YELLOW}Activating Emscripten...${NC}"
source $EMSDK_PATH/emsdk_env.sh

# Download libheif
cd $BUILD_DIR
if [ ! -f "libheif-${LIBHEIF_VERSION}.tar.gz" ]; then
    echo -e "${YELLOW}Downloading libheif v${LIBHEIF_VERSION}...${NC}"
    wget https://github.com/strukturag/libheif/releases/download/v${LIBHEIF_VERSION}/libheif-${LIBHEIF_VERSION}.tar.gz
    tar -xzf libheif-${LIBHEIF_VERSION}.tar.gz
fi

cd libheif-${LIBHEIF_VERSION}

# Configure for WebAssembly
echo -e "${YELLOW}Configuring build for WebAssembly...${NC}"
mkdir -p build-wasm
cd build-wasm

emcmake cmake .. \
    -DCMAKE_BUILD_TYPE=Release \
    -DBUILD_SHARED_LIBS=OFF \
    -DWITH_EXAMPLES=OFF \
    -DWITH_LIBDE265=ON \
    -DWITH_X265=OFF \
    -DWITH_AOM_DECODER=OFF \
    -DWITH_AOM_ENCODER=OFF \
    -DENABLE_MULTITHREADING_SUPPORT=OFF \
    -DCMAKE_C_FLAGS="-O3 -flto" \
    -DCMAKE_CXX_FLAGS="-O3 -flto"

# Build
echo -e "${YELLOW}Building libheif...${NC}"
emmake make -j$(nproc)

# Create the final WASM module
echo -e "${YELLOW}Creating optimized WASM module...${NC}"
emcc \
    libheif/libheif.a \
    libde265/libde265.a \
    -O3 \
    -flto \
    -s WASM=1 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME="LibHeif" \
    -s EXPORTED_FUNCTIONS='["_heif_context_alloc","_heif_context_free","_heif_context_read_from_memory","_heif_context_get_number_of_top_level_images","_heif_context_get_primary_image_handle","_heif_context_get_image_handle","_heif_image_handle_decode_image","_heif_image_get_width","_heif_image_get_height","_heif_image_get_plane","_malloc","_free"]' \
    -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","HEAPU8","HEAP8","HEAP16","HEAP32","allocate","intArrayFromString","ALLOC_NORMAL"]' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MAXIMUM_MEMORY=2GB \
    -s TOTAL_MEMORY=64MB \
    -s NO_EXIT_RUNTIME=1 \
    -s NO_FILESYSTEM=1 \
    -s ENVIRONMENT='web,worker' \
    -o $OUTPUT_DIR/libheif.js

echo -e "${GREEN}Build complete! Output files in $OUTPUT_DIR${NC}"
echo -e "${GREEN}Generated files:${NC}"
echo -e "  - libheif.js"
echo -e "  - libheif.wasm"