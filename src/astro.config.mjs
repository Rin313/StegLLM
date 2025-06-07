import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  build: {
    inlineStylesheets: `always`,//内联css
    format: 'directory',
    //assets默认为_astro，目前不能设置为空
  },
  devToolbar: {
    enabled: false
  },
  vite: {
    plugins: [tailwindcss()],
    esbuild:{
      drop: ["console"],//移除console.log
    }
    //目前不存在选项来移除html中的空格
    //目前缺少内置的移除"/*! tailwindcss v4.1.8 | MIT License | https://tailwindcss.com */"的选项
    ///.well-known/appspecific/com.chrome.devtools.json 127.0.0.1 404 一个悬而未决的问题，改浏览器设置和开插件都未解决
  },
  site: 'https://Rin313.github.io',
  base: '/StegLLM',
  //outDir: '../StegLLM/data/dist/StegLLM',
});