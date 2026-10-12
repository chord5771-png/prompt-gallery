# Prompt Gallery

一个轻量的 AI 图片提示词画廊。数据保存在仓库中，网站由 GitHub Pages 直接托管，无需账号、数据库或 API 密钥。

## 本地预览

```sh
python3 -m http.server 8000
```

打开 <http://localhost:8000>。请使用本地服务器预览；浏览器直接打开 `index.html` 时可能阻止读取 JSON。

## 收录提示词

收录和修改规则见 [AGENTS.md](AGENTS.md)。画廊读取 `data/prompts.json`；新增记录后运行：

```sh
python3 scripts/validate_data.py
```

示例图放在 `assets/covers/`。没有授权示例图时，使用明确标记“风格示意”的原创占位图；不可把占位图当成真实生成效果。

## 发布

GitHub Pages 使用仓库根目录的 `index.html`。在仓库 **Settings → Pages → Build and deployment** 中选择 **Deploy from a branch**、`main`、`/(root)`。发布地址预计为 <https://chord5771-png.github.io/prompt-gallery/>。
