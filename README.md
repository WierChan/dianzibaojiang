# 电子包浆生成器 (Internet Patina Generator)

把任何图片变成「在互联网上流传了十五年」的样子。不是 AI 生成,不是复古滤镜——
是用确定性图像处理算法模拟一张图的流传史:上传、压缩、截图、再上传、屏摄、再压缩。

图片的做旧处理全部在你的浏览器本地完成。只有当你登录后主动「保存到历史」或「发布到作品广场」时,成品图才会上传到你的账号(存于 Cloudflare R2);不保存就不上传。

## 运行

```bash
npm install
npm run dev
```

前端默认访问后端 `http://localhost:7010`,可用环境变量覆盖(见 [`.env.example`](.env.example)):

```bash
cp .env.example .env.local   # 按需修改 NEXT_PUBLIC_API_BASE_URL
```

预设列表、登录、历史与作品广场由后端提供,需另行启动后端服务;上线时后端务必走 **HTTPS**,否则登录会明文传输用户名密码。

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

技术栈:前端 Next.js + TypeScript + TailwindCSS + shadcn/ui + Canvas(做旧引擎纯客户端,`lib/effects/`);后端提供账号、历史与作品广场,成品图存 Cloudflare R2,前端通过 `lib/api/` 访问。
