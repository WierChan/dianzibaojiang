# 电子包浆生成器 (Internet Patina Generator)

把任何图片变成「在互联网上流传了十五年」的样子。不是 AI 生成,不是复古滤镜——
是用确定性图像处理算法模拟一张图的流传史:上传、压缩、截图、再上传、屏摄、再压缩。

纯浏览器端处理,图片不会离开你的设备。

![原图 → 百度贴吧满强度包浆效果对比](docs/demo.jpg)

## 运行

```bash
npm install
npm run dev
```

## 预设

| 预设 | 味道 |
| --- | --- |
| 互联网经典 | 泛用型网络老化:反复 JPEG、缩放损失、噪点、偏色 |
| QQ 2008 | 冷蓝调、狠压缩、过度锐化、CRT 扫描线与光晕 |
| 百度贴吧 | 经典变绿、色度崩坏、锐化光边、反复压缩 |
| 微信转发 | 压到 640px、轻糊、截图痕迹、褪色 |
| 截图套截图 | 反复截图:状态栏残影、边缘漂移、尺寸缩水 |
| 手机屏摄 | 拿手机拍屏幕:透视畸变、失焦、真摩尔纹、眩光、传感器噪点 |
| 互联网活化石 | 所有算法轮番上阵若干轮 |

## 架构

- `lib/effects/` — 每个退化效果都是独立、可组合的纯函数(`compressJPEG`、`resizeRoundTrip`、`addNoise`、`simulateCRT`、`addMoire`、`simulateScreenshot`、`pixelate`、`addWatermark`…)
- 水印(致敬 [magiconch.com/patina](https://magiconch.com/patina/)):右下角「@用户名」白字带阴影,在管线最前面盖章,跟图一起包浆
- `lib/effects/pipelines.ts` — 预设 = 效果函数的组合;新预设只需拼装现有效果
- `lib/effects/random.ts` / `seed.ts` — 种子化随机:留空每次微妙不同,填种子则完全可复现
- 强度滑杆 0–100 平滑插值所有参数;预览在 ≤1600px 下运行以保证速度,下载时以原分辨率(≤6000px)重跑同一种子

技术栈:Next.js + TypeScript + TailwindCSS + shadcn/ui + Canvas,无后端。
