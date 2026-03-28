# API Key Setup Guide

## 繁體中文

呢份文件會一步一步教你建立：

- Google Cloud Speech-to-Text API key
- OpenRouter API key

TypeFree 目前使用的是 Google Cloud Speech-to-Text 的 API key 字串，不是 service account JSON。換句話說，你需要的是一條可直接填入 app 設定頁的 API key。

### A. 建立 Google Cloud Speech-to-Text API key

#### 1. 登入 Google Cloud Console

前往 [Google Cloud Console](https://console.cloud.google.com/) 並登入你的 Google 帳戶。

#### 2. 建立或選擇一個 Google Cloud project

- 在頁面上方打開 project selector
- 選擇現有 project，或者建立一個新 project

如果你建立的是新 project，Google 會要求你連結 billing account。根據 Google 官方文件，Speech-to-Text API 需要啟用 billing 才可以使用，即使你仍然可能落在 free quota 範圍內。

#### 3. 啟用 Cloud Speech-to-Text API

- 在 Google Cloud Console 頂部的搜尋欄輸入 `speech`
- 打開 `Cloud Speech-to-Text API`
- 按 `Enable`

如果你未啟用 billing，通常會先被要求完成 billing 設定。

#### 4. 前往 Credentials 頁面

前往 [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)。

#### 5. 建立 API key

- 按 `Create credentials`
- 選擇 `API key`
- Google 會即時產生一條新的 API key

請立即複製這條 key，稍後會填入 TypeFree 的設定頁。

#### 6. 為 API key 加限制

Google 官方文件建議你為 API key 加限制。對 TypeFree 呢類桌面 app，最實用的做法通常是先加 API restrictions。

建議做法：

- 打開剛建立的 API key 詳細頁
- 在 `API restrictions` 選擇 `Restrict key`
- 只允許 `Cloud Speech-to-Text API`
- 儲存

補充：

- `Application restrictions` 是否要加，要視乎你的使用方式而定
- 如果你只是自己在本機 Windows app 使用，很多時候未必適合套用瀏覽器 referrer 類限制
- 如果你不確定，至少先加 `API restrictions`

#### 7. 把 key 填入 TypeFree

打開 TypeFree 的設定頁，將這條 key 填入 `Google Speech API key` 欄位。

#### 8. 常見提醒

- 沒有 billing：Speech-to-Text API 不能正常使用
- 沒有啟用 `Cloud Speech-to-Text API`：請求會失敗
- key 沒有複製下來：回到 Credentials 頁面重新建立或管理
- 不要把 API key commit 到 Git repo、截圖公開、或者貼到公開討論區

### B. 建立 OpenRouter API key

#### 1. 登入 OpenRouter

前往 [OpenRouter](https://openrouter.ai/) 並登入或建立帳戶。

#### 2. 前往 API key 頁面

OpenRouter 官方文件的 authentication 說明在這裡：

- [OpenRouter Authentication Docs](https://openrouter.ai/docs/api/reference/authentication)

你可以從帳戶後台進入建立 API key 的頁面。

#### 3. 建立新的 API key

根據 OpenRouter 官方文件，建立 key 時可以：

- 為 key 命名
- 視需要設定 credit limit

建立後，複製該 API key。

#### 4. 把 key 填入 TypeFree

打開 TypeFree 的設定頁：

- 如果你選擇 `OpenRouter` 作為 LLM provider
- 把 API key 填入 `OpenRouter API key`
- 再填入你想用的 model，例如 repo 預設值 `openai/gpt-4o-mini`

#### 5. 常見提醒

- OpenRouter key 通常以 Bearer token 形式使用
- 如果帳戶沒有可用額度、付款設定或 credit limit 設定不合適，請求可能會失敗
- 同樣不要把 API key 放進 repo 或公開分享

### C. 在 TypeFree 內完成最後設定

當你完成兩邊 key 設定之後，建議再檢查以下項目：

- `Speech provider` 目前應為 `google`
- `Google Speech API key` 已填入
- `LLM provider` 已選 `OpenRouter` 或 `Ollama`
- 如果選 `OpenRouter`，`OpenRouter API key` 和 `OpenRouter model` 已填入
- 如果選 `Ollama`，`Ollama base URL` 和 `Ollama model` 已填入
- `Source language` 是否符合你的口語語言，例如預設 `yue-Hant-HK`

---

## English

This guide walks you through creating:

- a Google Cloud Speech-to-Text API key
- an OpenRouter API key

TypeFree currently uses a Google Cloud API key string for Speech-to-Text, not a service account JSON file. In practice, that means you want a key that you can paste directly into the app settings.

### A. Create a Google Cloud Speech-to-Text API key

#### 1. Sign in to Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com/) and sign in with your Google account.

#### 2. Create or select a Google Cloud project

- Open the project selector at the top of the page
- Choose an existing project or create a new one

If you create a new project, Google will prompt you to link a billing account. According to Google's official Speech-to-Text setup documentation, billing must be enabled before you can use the API, even if your usage still falls within the free quota.

#### 3. Enable the Cloud Speech-to-Text API

- In the top search bar, search for `speech`
- Open `Cloud Speech-to-Text API`
- Click `Enable`

If billing is not enabled yet, Google may ask you to finish billing setup first.

#### 4. Open the Credentials page

Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).

#### 5. Create an API key

- Click `Create credentials`
- Select `API key`
- Google will generate a new API key immediately

Copy the key right away, because you will paste it into TypeFree next.

#### 6. Restrict the API key

Google's official API key documentation recommends applying restrictions. For a desktop app like TypeFree, the most practical starting point is usually API restrictions.

Recommended setup:

- Open the newly created key's detail page
- Under `API restrictions`, choose `Restrict key`
- Allow only `Cloud Speech-to-Text API`
- Save the change

Notes:

- Whether to use `Application restrictions` depends on your own environment
- For a personal Windows desktop app, browser referrer restrictions often do not fit well
- If you are unsure, at least apply `API restrictions`

#### 7. Paste the key into TypeFree

Open TypeFree settings and paste the key into the `Google Speech API key` field.

#### 8. Common reminders

- No billing: the Speech-to-Text API will not work
- API not enabled: requests will fail
- Key not copied: go back to Credentials and create or manage a key again
- Do not commit the API key to Git, post screenshots of it, or share it publicly

### B. Create an OpenRouter API key

#### 1. Sign in to OpenRouter

Go to [OpenRouter](https://openrouter.ai/) and sign in or create an account.

#### 2. Open the API key area

The official OpenRouter authentication documentation is here:

- [OpenRouter Authentication Docs](https://openrouter.ai/docs/api/reference/authentication)

From your account dashboard, open the page where you create API keys.

#### 3. Create a new API key

According to OpenRouter's official docs, when creating a key you can:

- give the key a name
- optionally set a credit limit

After the key is created, copy it.

#### 4. Paste the key into TypeFree

Open TypeFree settings:

- choose `OpenRouter` as the LLM provider
- paste the key into `OpenRouter API key`
- enter the model you want to use, such as the repo default `openai/gpt-4o-mini`

#### 5. Common reminders

- OpenRouter uses the key as a Bearer token
- If your account has no usable balance, payment setup, or the credit limit is too low, requests can fail
- Do not commit or publicly share the API key

### C. Final checklist inside TypeFree

After both keys are ready, check the following in the app:

- `Speech provider` is currently `google`
- `Google Speech API key` is filled in
- `LLM provider` is set to `OpenRouter` or `Ollama`
- If `OpenRouter` is selected, `OpenRouter API key` and `OpenRouter model` are filled in
- If `Ollama` is selected, `Ollama base URL` and `Ollama model` are filled in
- `Source language` matches your spoken language, such as the default `yue-Hant-HK`

## Official References

- Google Cloud Speech-to-Text setup: [Set up Cloud Speech-to-Text for your Google Cloud project](https://docs.cloud.google.com/speech-to-text/docs/setup)
- Google Cloud API keys: [Manage API keys](https://docs.cloud.google.com/docs/authentication/api-keys)
- OpenRouter authentication: [Authentication](https://openrouter.ai/docs/api/reference/authentication)
