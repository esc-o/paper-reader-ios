# Paper Reader iOS

iOS 版的 [Paper Reader](https://github.com/esc-o/paper-reader)。界面和交互跟网页的手机端一致：首页、书架、笔记、导入 PDF、翻页阅读、高亮、划线和评论、选词查词翻译。这是单独的工程，不会改原来的 `paper-reader` 仓库。

应用用 Capacitor 把这套手机页面装进 Xcode 工程，打包后的 Bundle ID 是 `app.paperreader.ios`。PDF 和阅读数据留在这台手机上。配置了 Supabase 之后，登录可以同步进度和笔记，PDF 文件仍然只在本地。

## 打出 IPA

需要一台 Mac、Xcode 16 或更新版本，以及用来签名的 Apple Developer 团队。当前这台构建环境是 Linux，没有 Xcode，所以 IPA 要在 Mac 上归档。工程里已经放进打包好的手机页面，克隆后可以直接用 Xcode 打开。

```bash
open ios/App/App.xcodeproj
```

改了网页之后，再同步进 Xcode：

```bash
npm install
cp .env.example .env   # 需要登录同步时再填，只在本地读可以留空
npm run ios:sync
```

在 Xcode 里：

1. 选中 App target，在 Signing & Capabilities 里选择你的 Team。Bundle ID 如果和别人冲突，改成你自己的。
2. 运行目标选 Any iOS Device（arm64），不要选模拟器。
3. 菜单 Product → Archive。
4. 归档完成后选 Distribute App → Custom → Release Testing 或 Debugging，导出 IPA。

只想装到自己的手机上时，把目标改成已连接的 iPhone，直接点 Run 即可。

## 登录回跳

Google 登录会打开系统浏览器，完成后回到 App。请在 Supabase 的 Redirect URLs 里加上：

```text
paperreader://login-callback
```

## 从「文件」打开 PDF

安装后，可以在「文件」或邮件里对 PDF 选择共享 / 用 Paper Reader 打开，App 会导入并进入阅读。也可以在首页点「导入 PDF」。
