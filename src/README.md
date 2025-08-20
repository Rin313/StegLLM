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

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## Node.js
```
volta list 查看当前各个工具的版本
volta install node@latest;volta install node@14.21.3; 用于切换版本
volta uninstall node
```

