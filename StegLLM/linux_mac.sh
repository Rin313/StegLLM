#!/bin/bash
set -x
buildNum="b5193"
scriptDir="$(dirname "$(realpath "$0")")"
dataDir="${scriptDir}/data"
# 确定系统和指令集
os=""
arch=""
if [[ "$(uname -s)" == "Darwin" ]]; then
    os="macos"
elif [[ "$(uname -s)" == "Linux" ]]; then
    os="ubuntu"
else echo "unSupported System."
    exit 1
fi
if [[ "$(uname -m)" == "arm64" || "$(uname -m)" == "aarch64" ]]; then
    arch="arm64"
elif [[ "$(uname -m)" == "x86_64" ]]; then
    arch="x64"
fi
# 下载 llama.cpp
name="llama-${buildNum}-bin-${os}-${arch}"
if [ ! -d "${dataDir}/${name}" ]; then
    echo "Downloading: ${name}.zip"
    if ! curl --insecure --compressed -C - -Lo "${name}.zip" "https://github.com/ggml-org/llama.cpp/releases/download/${buildNum}/${name}.zip"; then
        echo "Download failed."
        exit 1
    fi
    if ! unzip -o "${name}.zip" -d "${dataDir}/${name}"; then
        echo "Extraction failed."
        exit 1
    fi
    rm -f "${name}.zip"
fi
# 查找 gguf 文件
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
# 启动 llama-server
llamaServer=$(find "${dataDir}/${name}" -type f -name 'llama-server' | head -n 1)
LIB_DIR="$(dirname "$llamaServer")"
# 添加临时环境变量
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
    --temp 0.8 \
    --repeat-penalty 1.18 \
    --repeat-last-n 128 \
    --no-perf \
    --prio 3 \
    --prio-batch 3 \
    --poll 100 \
    --log-verbosity 0 \
    --props \
    --timeout 60 \
    --no-slots \
    --seed -1 &
echo "Waiting for the server to start..."
while ! curl --silent "http://127.0.0.1:${port}" >/dev/null 2>&1; do
    sleep 1
done
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:${port}"
elif command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:${port}"
else
    echo "Server is running at http://127.0.0.1:${port}. Please open it manually in your browser."
fi