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
    //目前不存在选项来移除html中的空格
  },
  site: 'https://Rin313.github.io',
  base: '/StegLLM',
  //outDir: '../StegLLM/data/dist/StegLLM',
});