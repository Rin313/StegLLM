[简体中文](README.md) | [English](README_en.md)

# StegLLM

An offline AI tool that cleverly disguises your secret messages as a piece of ordinary text.
> Unlike encryption, the essence of steganography is **to hide the very existence of a message**.

## Some Fun Use Cases

- **Share a Little Secret:**  
  Want to send a friend a private message that "only we understand"? Hide it in seemingly normal text, making it completely invisible to others.
- **Add a Watermark:**  
  Embed an invisible signature or date in your novels or articles to prove your original authorship.
- **A Game of Hide-and-Seek:**  
  Hide your true opinions in a movie or food review on a public forum or social media.
- **Code Pranks:**  
  Hide secret instructions in log files or code comments to assign secret tasks to your program

## Quick Start

- **Decryption Only:** Visit https://rin313.github.io/StegLLM/

This is a webpage with only decryption functionality, but you can see a basic demo interface here.

- **Steganography + Decryption:**

Download [StegLLM.zip](https://github.com/Rin313/StegLLM/releases)

For Windows: Run `windows.bat`

For Linux/MacOS: Run `linux_mac.sh`

## Using a Custom Model (Optional)

Obtain a **gguf** file from any source, such as **Hugging Face** or **ModelScope**, and replace the gguf file in the **data** folder of the project directory.

## Deploying to Android (Beta)

Using **Termux**:

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

## Workflow Diagram

```mermaid
flowchart TD
    A[Start] --> compress[Compression<br>Unishox or Deflate-Raw]
    compress --> encrypt[ECC Encryption - Optional]
    public[Recipient's Public Key] --> encrypt
    encrypt --> base[Encode as Binary Sequence]
    base --> magicNum[Add Magic Number and Length Field - Optional]
    magicNum --> prompt[Initialize Prompt]
    prompt --> dfs[Build Token Generation Tree with DFS]
    dfs --> weightsNum{Weighted Sum >= Threshold?}
    weightsNum --> |Yes| mapping{parity = bit?}
    weightsNum --> |No| dfs
    mapping --> |Yes| mappingDone{Is Current Token Mapping Complete?}
    mapping --> |No| dfs
    mappingDone --> |Yes| coverText[Update Cover Text and Context]
    mappingDone --> |No| dfs
    coverText --> done{Embedding Complete?}
    done --> |Yes| tail[Padding Tail - Optional]
    done --> |No| dfs
    tail --> endd[End]
```

## Disclaimer

This project is intended for learning and research purposes only. Please do not use it for illegal activities. The author assumes no responsibility for any loss or damage caused by the use of this project.

Special thanks to: **[LLM-Steganography](https://github.com/HighDoping/LLM-Steganography/), [llama.cpp](https://github.com/ggml-org/llama.cpp), [Unishox2](https://github.com/siara-cc/Unishox2)**.
