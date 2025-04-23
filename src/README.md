```sh
volta list 查看当前各个工具的版本
volta install node@latest;volta install node@14.21.3;volta install node@v18.20.8 用于切换版本
volta uninstall node
```
```sh
npm create astro@latest
npm create astro@latest astro-ui -- --template basics --add tailwind --install --git
npm i hash-wasm
npm i @tailwindcss/vite@latest
npm i daisyui@latest
npm i astro@latest
npm i @noble/curves
```
打包源码
```
Invoke-WebRequest -Uri "https://github.com/Rin313/StegLLM/archive/refs/heads/main.zip" -OutFile "../StegLLM/源码.zip"
```
```
llama-perplexity -m gemma-3-4b-it-Q6_K.gguf -f <file> 困惑度测试 
```
//前端轮子大舞台真的很爱瞎搞，不科学的设计模式导致一大堆不向前兼容的调整，比起不稳定地升级项目，最好每隔一阵子就初始化一个项目覆盖一些配置，并通过git更改来进行调整
目前astro似乎没法在本地实现国际化，site配置用不了本地域名好像。

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/basics)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/basics)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/basics/devcontainer.json)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       └── index.astro
└── package.json
```
public:不会在构建过程中处理的静态资源，而src中的css/js等会进行处理和压缩 //根路径"/"为"/public"

public中的图片通过路径调用，src中的图片通过import导入，得到一个包含{src、格式、宽度、高度}的对象

*pages*:必须的表示页面的组件，使用a标签和相对根路径的链接来进行路由


To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
