#!/bin/bash
set -x
buildNum="b5503"
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
    --top-p 0.95 \
    --repeat-penalty 1.18 \
    --repeat-last-n 64 \
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
while ! curl --silent "http://127.0.0.1:${port}/StegLLM/" >/dev/null 2>&1; do
    sleep 1
done
if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://127.0.0.1:${port}/StegLLM/"
elif command -v open >/dev/null 2>&1; then
    open "http://127.0.0.1:${port}/StegLLM/"
else
    echo "Server is running at http://127.0.0.1:${port}/StegLLM/. Please open it manually in your browser."
fi

# todo 启用--http2，目前windows版的curl仍然不支持

#
# -c 0 上下文大小使用模型默认值，但这可能对低端设备不友好
# --top-p 0.9 值越低，被过滤的token数量越多
# --no-perf 关闭内部性能计时
# --prio 3 最高进程优先级，这是一个即开即用的实时需求。
# --poll 100 全轮询(持续主动检查是否有新任务)
# --timeout 600 读写超时时间(秒)
# --log-verbosity 0 最基础的日志级别
# props 允许通过接口修改全局属性
# --no-slots 禁用槽监控，不需要运维数据
# --repeat-penalty 重复惩罚，1.0为无惩罚
# --repeat-last-n 惩罚最后n个token


# --keep 能够让前n个token不会被抛弃，永远保持在上下文中
# --defrag-thold KV缓存碎片整理的阈值。KV缓存会随着长文本推理产生"碎片"（无效空间），可能导致缓存空间利用率降低。
# --no-kv-offload 禁用KV卸载，所有 KV 缓存都必须常驻在主内存或显存中，内存换性能
# --mlock 锁定模型数据在物理内存，内存换性能
# --no-mmap 一次性加载模型，加载速度更慢，内存占用似乎也会更高