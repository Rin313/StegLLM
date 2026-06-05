#!/bin/bash
set -x
buildNum="b6258"
scriptDir="$(dirname "$(realpath "$0")")"
dataDir="${scriptDir}/data"
os=""
arch=""
if [[ "$(uname -s)" == "Darwin" ]]; then
    os="macos"
elif [[ "$(uname -s)" == "Linux" ]]; then
    os="ubuntu"
else
    echo "unSupported System."
    exit 1
fi
if [[ "$(uname -m)" == "arm64" || "$(uname -m)" == "aarch64" ]]; then
    arch="arm64"
elif [[ "$(uname -m)" == "x86_64" ]]; then
    arch="x64"
fi

name="llama-${buildNum}-bin-${os}-${arch}"
archive="${name}.tar.gz"
if [ ! -d "${dataDir}/${name}" ]; then
    echo "Downloading: ${archive}"
    if ! curl --compressed -C - -Lo "${archive}" "https://github.com/ggml-org/llama.cpp/releases/download/${buildNum}/${archive}"; then
        echo "Download failed."
        exit 1
    fi
    mkdir -p "${dataDir}/${name}"
    if ! tar -xzf "${archive}" -C "${dataDir}/${name}"; then
        echo "Extraction failed."
        exit 1
    fi
    rm -f "${archive}"
fi
gguf=""
for file in "${dataDir}"/*.gguf; do
    if [ -f "$file" ]; then
        gguf="$file"
        break
    fi
done
if [ -z "$gguf" ]; then
    echo "No .gguf file found in '${dataDir}' directory."
    exit 1
fi
llamaServer=$(find "${dataDir}/${name}" -type f -name 'llama-server' | head -n 1)
LIB_DIR="$(dirname "$llamaServer")"
export LD_LIBRARY_PATH="$LIB_DIR:$LD_LIBRARY_PATH"
if [ ! -f "$LIB_DIR/libgomp.so.1" ]; then
    sudo apt-get install -y libcurl4-openssl-dev libgomp1
fi
port=8090
"$llamaServer" \
    -m "$gguf" \
    --path "${dataDir}/dist" \
    --host 127.0.0.1 \
    --port "$port" \
    -c 4096 \
    --reasoning-budget 0 \
    --reasoning-format none \
    --sampling-seq edskypxt \
    --repeat-penalty 1.18 \
    --no-perf \
    --flash-attn \
    --slot-prompt-similarity 0.0 \
    --prio 3 \
    --prio-batch 3 \
    --poll 100 \
    --log-verbosity 0 \
    --props \
    --timeout 60 \
    --seed -1 &
echo "Waiting for the server to start..."
while :; do
    code=$(curl --silent -o /dev/null -w "%{http_code}" "http://127.0.0.1:${port}/StegLLM/" 2>/dev/null)
    [ "$code" != "503" ] && [ "$code" != "000" ] && break
    sleep 1
done
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:${port}/StegLLM/"
elif command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:${port}/StegLLM/"
else
    echo "Server is running at http://127.0.0.1:${port}/StegLLM/. Please open it manually in your browser."
fi