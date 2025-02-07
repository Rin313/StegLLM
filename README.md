# StegLLM

StegLLM 是一个利用LLM进行文本隐写的项目，目前只开发了针对中文的加密。

**注意：本项目目前处于实验阶段，隐写效果和稳定性有待进一步提高。**

## 使用说明

### 1. 下载 Llamafile 模型

本项目推荐使用 Qwen2.5-0.5B-Instruct-Q6_K.llamafile。您可以从 Hugging Face 或 ModelScope 等模型托管平台下载。

- **Qwen2.5-0.5B-Instruct-Q6_K.llamafile:**  体积较小，推理速度快。
- **Qwen2.5-1.5B-Instruct / Qwen2.5-3B-Instruct:**  如果追求更好的隐写效果，可以选择参数更大的模型。

**Llamafile 运行权限 (macOS, Linux, BSD):**

对于上述平台，下载完成后，您需要为 llamafile 授予执行权限：

```bash
chmod +x <llamafile文件名>
```
请参考 [Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile) 的官方文档。

**Windows 用户注意事项:**

如果在 Windows 下运行大于 4GB 的 llamafile，需要进行一些额外的操作。

请参考 [Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile) 的官方文档。

### 2. 创建 System Prompt 文件

在 llamafile 所在的目录下，创建一个名为 `system_prompt.txt` 的文件，并将以下内容复制到文件中：

```json
{
    "system_prompt": {
        "prompt": "你是擅长散文和小说的中国浪漫主义作家，只创作充满情感，幻想和哲理的文字。你在续写文章时词汇丰富，经常使用不常规的词语和语法，并且绝对不会添加标题、作者、序号、提示等任何额外的信息或说明。",
        "assistant_name": "Assistant:"
    }
}
```

**自定义 System Prompt (可选):**

您可以根据自己的需要修改 `system_prompt.txt` 中的内容。  但请注意，Qwen2.5-0.5B 模型的调教难度较高，不恰当的 system prompt 可能会影响隐写效果。

### 3. 创建启动脚本

在 llamafile 所在的目录下，创建一个批处理脚本。以windows为例：

`start_server.bat`
```batch
<llamafile文件名>  --server -spf system_prompt.txt
```

例如：

```batch
Qwen2.5-0.5B-Instruct-Q6_K.llamafile --server -spf system_prompt.txt
```

以后，您可以通过双击此脚本来启动 llamafile 服务器。

Linux、macOS或其他平台的脚本写法请自行查阅相关资料。

### 4. 安装油猴脚本 (Tampermonkey Script)

1.  安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)。
2.  安装 StegLLM 用户脚本: [点击这里安装](https://greasyfork.org/zh-CN/scripts/525684-stegllm)
3.  **配置脚本 (可选):**
    *   打开 Tampermonkey 的管理面板，找到 StegLLM 脚本，在脚本设置中，您可以自定义 prompt。
    *   默认 prompt 为 "请续写这段散文："。

**注意事项:**
*   由于加密过程可能需要较长时间，请将页面保持在后台运行。
*   由于语法惯性和模型体量的限制，加密过程可能无法找到合适的词汇进行编码。遇到这种情况时，请重新尝试。
*   加解密必须在同一网站进行。

## 贡献

欢迎提交 Issues 和 Pull Requests！

## 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 免责声明

本项目仅供学习和研究使用，请勿用于任何非法活动。对于因使用本项目造成的任何损失或损害，作者不承担任何责任。
