[简体中文](README.md) | [English](README_en.md)

# StegLLM

StegLLM 是一个离线的文本隐写项目，它利用大语言模型在正常的文本中隐藏秘密信息，无需安装或任何配置，且支持跨平台。

## 什么是文本隐写？

想象一下，你可以把一句话悄悄藏在一篇文章里，不被人轻易发现。

这就是文本隐写：把你想隐藏的信息融入到看似普通的文字中。

和加密不同，隐写的核心是**让人根本不知道信息的存在**。

## 文本隐写有什么“妙用”？

- **传递小秘密**：  
  想给朋友发个“只有我们才懂”的小秘密？藏在一段看似平常的文字里，让其他人完全无法察觉。
- **给作品加个“防伪码”**：  
  在你呕心沥血写成的小说里，偷偷加入一些只有你知道的“彩蛋”，证明这是你的原创。
- **躲猫猫游戏**：  
  在公共场合，我们可能想要让一些信息“隐身”，藏进普通的内容里。就像玩捉迷藏一样，看看谁能找到我！
- **代码恶作剧**：  
  想让你的程序在“无人知晓”的情况下执行一些特别的操作？把秘密指令藏进一段普通的日志文件或代码注释中，给你的程序下达秘密任务！

## 快速开始

- **仅解密：** 访问 https://rin313.github.io/StegLLM/

这是一个只包含解密功能的网页，但你可以在这里看到基本的演示界面。

- **隐写 + 解密：**

下载[StegLLM.zip](https://github.com/Rin313/StegLLM/releases)

Windows 系统：运行 `windows.bat`

Linux/MacOS 系统：运行 `linux_mac.sh`

## 使用自定义的模型（可选）

从 **Hugging Face** 或 **ModelScope** 等任何来源获取**gguf**文件，然后在项目目录的**data**文件夹中对 gguf 文件进行替换。

## 部署到 Android（Beta）

使用**Termux**：

```sh
apt update && apt upgrade -y
apt install git cmake
git clone --depth 1 https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build
cmake --build build --config Release -t -server
cd ..
curl --insecure --compressed -C - -LO https://github.com/Rin313/StegLLM/releases/download/v1.3.0/StegLLM.zip
unzip StegLLM.zip
cp -r llama.cpp/build/bin StegLLM/data/
bash StegLLM/android.sh
```

## 原理图

```mermaid
flowchart TD
    A[开始] --> compress[压缩<br>Unishox 或 Deflate-Raw]
    compress --> encrypt[ECC 加密 - 可选]
    public[接收方的公钥] --> encrypt
    encrypt --> base[编码为二进制序列]
    base --> magicNum[添加魔数和长度字段 - 可选]
    magicNum --> prompt[初始化 prompt]
    prompt --> dfs[以 DFS 方式构建 token 生成树]
    dfs --> weightsNum{加权和 >= 阈值?}
    weightsNum --> |是| mapping{xxhash % 2 = bit?}
    weightsNum --> |否| dfs
    mapping --> |是| mappingDone{当前 token 映射完成?}
    mapping --> |否| dfs
    mappingDone --> |是| coverText[更新掩饰文本和上下文]
    mappingDone --> |否| dfs
    coverText --> done{嵌入完成?}
    done --> |是| tail[尾部补全 - 可选]
    done --> |否| dfs
    tail --> endd[结束]
```

## 贡献

欢迎提交 Issues 和 Pull Requests！

## 免责声明

本项目仅供学习和研究使用，请勿用于非法用途。对于因使用本项目造成的任何损失或损害，作者不承担任何责任。特别感谢：**[LLM-Steganography](https://github.com/HighDoping/LLM-Steganography/),[llama.cpp](https://github.com/ggml-org/llama.cpp),[Unishox2](https://github.com/siara-cc/Unishox2)**
