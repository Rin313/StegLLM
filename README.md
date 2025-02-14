# StegLLM

StegLLM 是一个离线的文本隐写项目，它利用大语言模型LLM在正常的文本中隐藏秘密信息。无需安装或任何配置，即可在本地安全地进行隐写加密。

## 什么是文本隐写？

想象一下，你可以把一句话悄悄藏在一篇文章里，不被人轻易发现。

这就是文本隐写：把你想隐藏的信息融入到看似普通的文字中。

和加密不同，隐写的核心是**让人根本不知道信息的存在**。

## 文本隐写有什么“妙用”？

*   **传递小秘密：** 想给朋友发个“只有我们才懂”的小秘密？藏在一段看似平常的文字里，让其他人完全无法察觉。
*   **给作品加个“防伪码”：** 在你呕心沥血写成的小说里，偷偷加入一些只有你知道的“彩蛋”，证明这是你的原创。
*   **躲猫猫游戏：** 在公共场合，我们可能想要让一些信息“隐身”，藏进普通的内容里。就像玩捉迷藏一样，看看谁能找到我！

# 快速开始

下载[StegLLM.zip](https://github.com/Rin313/StegLLM/releases)

Windows系统：运行 `windows.bat`

Linux/MacOS系统：
1. 项目目录下执行下列指令
```bash
chmod +x linux_mac.sh data/*.llamafile
```
2. 运行 `linux_mac.sh`

界面演示

![StegLLM](img.png "界面演示")

如图所示，"待到秋来九月八，我花开后百花杀！"这段话可被加密成一段平平无奇的文章。

# 使用自定义的模型构建（可选）

1. 下载[StegLLM-pure.zip](https://github.com/Rin313/StegLLM/releases)
2. 从 **Hugging Face** 或 **ModelScope** 等任何来源获取希望使用的llamafile文件，放置到项目目录下的**data**文件夹中。

默认使用的模型是 `Qwen2.5-0.5B-Instruct-Q6_K`。使用参数较大的模型，通常可以获得更好的隐写效果。

**Windows 用户注意事项:**

如果在 Windows 下运行大于 4GB 的 llamafile，需要进行一些额外的操作。请参考 [Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile) 的官方文档。

# 续写提示设置（可选）

设置`prompts.txt`

```javascript
const prompts=[
    `续写一段散文：`,
    `续写一段仙侠小说：`,
    `续写一段现代诗歌：`,
];
```

# AI角色设置（可选）

设置`system_prompt.txt`

```json
{
  "system_prompt": {
    "prompt": "你是擅长续写文本的助手，你的任务是续写提供的文本，禁止给出任何提问、提示、任务要求、补充说明、评论和解释性文字。你的续写总是符合自然语言的表达方式，充满创造性，允许用户输入空白。",
    "assistant_name": "续写助手:"
  }
}
```

# 注意事项
*   加密和解密通常需要使用同一个模型
*   对于加密后得到的掩饰文本，尾部文本插入对解密的影响较小，头部插入和中间修改则不支持。
*   由于语法惯性和模型体量的限制，加密过程可能无法找到合适的选词进行编码。遇到这种情况时，请重新尝试。

# 原理图

![StegLLM](mermaid-diagram.png "StegLLM 原理图")

# 贡献

欢迎提交 Issues 和 Pull Requests！

# 免责声明

本项目仅供学习和研究使用，请勿用于非法用途。对于因使用本项目造成的任何损失或损害，作者不承担任何责任。

本项目采用 [MIT 许可证](LICENSE)。

特别感谢：**[LLM-Steganography](https://github.com/HighDoping/LLM-Steganography/),[llamafile](https://github.com/Mozilla-Ocho/llamafile),[Unishox2](https://github.com/siara-cc/Unishox2)**