[简体中文](README.md) | [English](README_en.md)
# StegLLM

StegLLM is an offline text steganography project that leverages large language models (LLMs) to hide secret information within normal text. It requires no installation or configuration, enabling secure steganographic encryption locally.

## What is Text Steganography?

Imagine being able to hide a sentence within an article without anyone easily noticing.

This is text steganography: embedding the information you want to conceal into seemingly ordinary text.

Unlike encryption, the essence of steganography is **to make people unaware that the information even exists**.

## What are the "Cool Uses" of Text Steganography?

*   **Sharing Little Secrets:** Want to send a friend a secret message that only the two of you understand? Hide it in a piece of seemingly ordinary text, leaving others completely unaware.
*   **Adding a "Watermark" to Your Work:** In a novel you've poured your heart into, secretly embed some "Easter eggs" that only you know about, proving it's your original creation.
*   **Playing Hide-and-Seek:** In public settings, you might want to make certain information "invisible" by embedding it within ordinary content. It's like playing a game of hide-and-seek—see who can find me!

# Quick Start

Download [StegLLM.zip](https://github.com/Rin313/StegLLM/releases)

For Windows: Run `windows.bat`

For Linux/MacOS:
1. Execute the following commands in the project directory:
```bash
chmod +x linux_mac.sh data/*.llamafile
```
2. Run `linux_mac.sh`

Here’s a simple example: As shown in the image, the phrase "When autumn arrives in September, my flowers bloom, and all other flowers wither!" can be encrypted into an unremarkable piece of text.

![StegLLM](img.png "Interface Demo")

# Notes
*   Encryption and decryption typically require using the same model.
*   For the resulting cover text after encryption, inserting text at the end has minimal impact on decryption, but inserting at the beginning or modifying the middle is not supported.
*   Due to limitations in grammatical habits and model size, the encryption process may fail to find suitable word choices for encoding. If this happens, please try again.

# Using a Custom Model (Optional)

1. Download [StegLLM-pure.zip](https://github.com/Rin313/StegLLM/releases)
2. Obtain the desired llamafile from sources like **Hugging Face** or **ModelScope**, and place it in the **data** folder within the project directory.

The default model used is `Qwen2.5-0.5B-Instruct-Q6_K`. Using models with larger parameters typically results in better steganographic performance.

**Notes for Windows Users:**

If running a llamafile larger than 4GB on Windows, additional steps are required. Please refer to the official documentation at [Mozilla-Ocho/llamafile](https://github.com/Mozilla-Ocho/llamafile).

# Continuation Prompt Settings (Optional)

Configure `prompts.txt`:

```javascript
const prompts=[
    `Continue writing an essay:`,
    `Continue writing a fantasy novel:`,
    `Continue writing a modern poem:`,
];
```

# AI Role Settings (Optional)

Configure `system_prompt.txt`:

```json
{
  "system_prompt": {
    "prompt": "You are an assistant skilled in continuing text. Your task is to extend the provided text naturally and creatively, without offering questions, hints, task requirements, additional explanations, comments, or interpretive text. Your continuation should always align with natural language expression and allow blank user input.",
    "assistant_name": "Continuation Assistant:"
  }
}
```

# Diagram

![StegLLM](mermaid-diagram.png "StegLLM Diagram")

# Contributing

We welcome Issues and Pull Requests!

# Disclaimer

This project is intended for educational and research purposes only. Do not use it for illegal activities. The author is not responsible for any loss or damage caused by using this project.

This project is licensed under the [MIT License](LICENSE).

Special thanks to: **[LLM-Steganography](https://github.com/HighDoping/LLM-Steganography/), [llamafile](https://github.com/Mozilla-Ocho/llamafile), [Unishox2](https://github.com/siara-cc/Unishox2)**