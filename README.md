# دفتر عیار

حسابداری چندکاربرهٔ طلا فروشی برای دو دامنه: طلای آبشده و متفرقه (به همراه شرطی، جواب ری و ذوب) و سکهٔ تعدادی. این نسخه بخش‌های مربوط دفتر زرین ۶۴ را ساده کرده تا بشود با آن کار کرد، نه اینکه کل زرین را تکرار کند.

رابط راست‌به‌چپ و فارسی است، تاریخ شمسی است، رقم‌ها در نمایش فارسی‌اند و مبلغ هم به ریال و هم به تومان دیده می‌شود.

## اجرا

پیش‌نیاز: Node.js ۲۰ یا جدیدتر، و PostgreSQL ۱۶.

```bash
docker compose up -d          # یا یک Postgres محلی با همین مشخصات
cp .env.example .env
npm install
npm run setup                 # مهاجرت پایگاه و دادهٔ نمونه
npm run dev                   # http://127.0.0.1:43123
```

آزمون محاسبه:

```bash
npm test
```

ورود نمونه:

| نقش | نام کاربری | رمز |
| --- | --- | --- |
| مدیر | `reza` | `ayar750` |
| کاربر عملیات | `sara` | `ayar740` |

مدیر می‌تواند کاربر بسازد، تنظیمات را عوض کند و سند را ابطال کند. کاربر عملیات سند، حساب و مظنه ثبت می‌کند. هر سند نام ثبت‌کننده را نگه می‌دارد و در صفحهٔ حسابرسی هم می‌آید.

## قواعدی که از دفتر زرین برداشته شد

علامت مانده: عدد مثبت یعنی **بدهکار** (طرف به مغازه بدهکار است). عدد منفی یعنی **بستانکار**. برای صندوق و بانک، همان عدد مثبت **موجودی** است و عدد منفی کسری.

### وزن ۷۵۰

```
وزن ۷۵۰ = گرد(وزن ترازو × عیار / ۷۵۰, سه رقم اعشار)
```

گرد کردن نیم‌به‌بالا است. ۱۰۰ گرم عیار ۷۴۰ می‌شود ۹۸٫۶۶۷ گرم ۷۵۰. عیار مبنای دفتر ۷۵۰ است و در این نسخه ثابت می‌ماند.

عیار پیش‌فرض **متفرقه** ۷۴۰ است و مدیر از تنظیمات عوضش می‌کند (همان پیشنهاد زرین، که در Alt+F12 قابل تغییر بود). اگر برای **آبشده** عیار ندهید، ۷۵۰ پیشنهاد می‌شود. طلای **شرطی** تا رسیدن جواب ری با عیار موقت ۷۵۰ در حساب می‌نشیند، حتی اگر وزن ترازو همان باشد.

### مظنه

مظنهٔ مثقال، قیمت یک مثقال **۴٫۶۰۸۳** گرمی با عیار **۷۰۵** است. قیمت یک گرم ۷۵۰:

```
قیمت گرم ۷۵۰ = مظنه مثقال / (۴٫۶۰۸۳ × ۷۰۵ / ۷۵۰) = مظنه مثقال / ۴٫۳۳۱۸۰۲
مبلغ = گرد(وزن ۷۵۰ × قیمت گرم)
```

می‌شود به‌جای مثقال، مستقیم مظنهٔ گرم ۷۵۰ داد، یا مبلغ کل را دستی نوشت. مبلغ دستی بر محاسبهٔ مظنه مقدم است. مثال دفتر: مشتری ۱۵۹٬۰۰۰٬۰۰۰ ریال بدهکار است، ۷۰٫۵۳ گرم متفرقه را به ۱۱۹٬۰۰۰٬۰۰۰ ریال می‌خرد و ۴۰٬۰۰۰٬۰۰۰ ریال بدهکار می‌ماند. در دادهٔ نمونه بعد از آن ۲۰٬۰۰۰٬۰۰۰ ریال هم به بانک واریز شده و مانده ۲۰٬۰۰۰٬۰۰۰ ریال است.

خرید و فروش پولی **حساب گرمی شخص را عوض نمی‌کند**. طلا به موجودی مغازه می‌آید یا از آن می‌رود و اثرش ریالی است. تسویه مثل ردیف‌های دریافت و پرداخت زرین می‌تواند بخشی نقد صندوق، بخشی یک یا چند بانک، و بخشی با سکه یا طلا باشد؛ آنچه نماند در حساب شخص می‌ماند. حواله فقط صندوق و بانک را جابه‌جا می‌کند و جمع وجوه را عوض نمی‌کند.

ورود و خروج گرمی (امانت / ته حساب) برعکس است: دریافت، شخص را بستانکار گرم می‌کند و موجودی را زیاد؛ خروج، شخص را بدهکار گرم می‌کند و موجودی را کم. عیار خروج دوباره پرسیده نمی‌شود. اگر وزن خروج از مانده کمتر باشد، بقیه در صندوق می‌ماند (قیچی).

### شرطی و جواب ری

تا جواب نیاید، وزن ۷۵۰ همان وزن ترازو است. با جواب:

- عیار واقعی جایگزین ۷۵۰ موقت می‌شود.
- کسر ذوب، اگر باشد، به نسبت وزن بین ماندهٔ صندوق و تکه‌هایی که قبلاً خارج شده‌اند سرشکن می‌شود. جمع وزن جدید دقیقاً برابر وزن اولیه منهای کسر است.
- اگر دریافت اولیه حساب گرمی را گردانده باشد، مابه‌التفاوت کل به همان حساب برمی‌گردد تا جمع اصلاح اشخاص و موجودی صفر بماند.
- اگر قطعه خرید پولی بوده، فروشنده گرم بدهکار یا بستانکار نمی‌شود و فقط موجودی (و کسی که تکه گرفته) اصلاح می‌شود.

جواب دوباره، فقط بعد از ابطال سند جواب قبلی است. سند ابطالی پاک نمی‌شود؛ اگر بعد از آن روی همان قطعه سند دیگری باشد، ابطال رد می‌شود.

### ذوب

ذوب یک حساب با گروه **هزینه / سوخت** است. طلا به آن حساب خارج می‌شود و آبشدهٔ برگشتی از همان حساب وارد می‌شود. اگر ارسال بیشتر از دریافت باشد، حساب ذوب بدهکار می‌ماند و این بدهکاری زیان مغازه است، نه طلب از مشتری. برگشتی می‌تواند هنوز شرطی باشد.

### سکه

انواع نمونه: تمام امامی، تمام بهار آزادی، تمام قدیم، نیم، ربع، گرمی.

- **خرید و فروش:** موجودی صندوق را عوض می‌کند و مبلغ (تعداد × فی) را در حساب ریالی می‌نشاند. ماندهٔ تعدادی شخص عوض نمی‌شود. مثال دفتر: ۳ عدد به فی ۱۵٬۰۰۰٬۰۰۰ ریال می‌شود ۴۵٬۰۰۰٬۰۰۰ ریال.
- **دریافت و پرداخت:** هم موجودی و هم ماندهٔ تعدادی شخص را عوض می‌کند (امانت). فی اینجا اجرت است و می‌تواند صفر باشد. اگر اجرت باشد، بدهکار شخص است مگر همان لحظه تسویه شود.
- فروش یا پرداخت بیش از موجودی صندوق رد می‌شود.

ملکی هر سکه = موجودی صندوق + طلب تعدادی − بدهی تعدادی اشخاص − بستانکاری سرمایه‌گذار.

### مانده‌ها

طلای ملکی = موجودی فیزیکی ۷۵۰ + طلب گرمی اشخاص − بدهی گرمی اشخاص − سرمایهٔ بستانکار گرم.

خرید پولی این عدد را بالا می‌برد، چون گرم به حساب کسی نرفته. سپردن طلا به مشتری این عدد را عوض نمی‌کند. زیان ذوب از موجودی کم شده و در حساب سوخت جدا دیده می‌شود.

## تراز و صندوق

تراز دو ستون دارد: دارایی در برابر بدهی. ریال شامل وجه صندوق، بانک‌ها، طلب و بدهی اشخاص و سرمایه است. گرم، معادل ۷۵۰ آبشده و متفرقه و طلب و بدهی گرمی است. سکه برای هر نوع جدا نشان داده می‌شود: موجودی صندوق، بدهکار و بستانکار اشخاص، و ملکی. ارزش ریالی سکه با فی فروش فقط یادداشت است و داخل بالانس ریالی جمع نمی‌شود، چون در سند ننشسته.

کارت حساب هر شخص صورتحساب ریال، گرم و سکه است با ستون بدهکار و بستانکار و ماندهٔ جاری. گزارش صندوق، ماندهٔ اول روز، ورود آبی، خروج قرمز و ماندهٔ پایان را برای صندوق و هر بانک جدا می‌نویسد.

## فرض‌هایی که دفتر در آن‌ها صریح نبود

- دقت وزن سه رقم اعشار است. نمونه‌های چاپی زرین گاهی دو رقم نشان می‌دهند (مثلاً ۹۸٫۶۷). اینجا ۹۸٫۶۶۷ نگه داشته می‌شود تا قیچی‌ها میلی‌گرم گم نکنند و تکهٔ آخر خطای گرد کردن را جذب کند.
- ضریب مثقال از ۴٫۶۰۸۳ و عیار ۷۰۵ و مبنای ۷۵۰ ساخته می‌شود، نه از عدد گردشدهٔ ۴٫۳۳۱۸. شرح بعضی وب‌سرویس‌های زرین با تقسیم بر ۱۰ جور درمی‌آید؛ آن را خطای متن کاتالوگ گرفتیم و فرمول بازار را گذاشتیم.
- کسر ذوب فقط روی متفرقهٔ شرطی در دفتر آمده؛ اینجا برای هر قطعهٔ شرطی مجاز است و به نسبت وزن سرشکن می‌شود.
- گروه حساب بعد از ساخت عوض نمی‌شود. زرین دست‌کم برای هزینه این را ممنوع کرده، چون ماهیت تراز را به‌هم می‌ریزد.
- تبدیل متفرقه به ساخته در این نسخه نیست. ساخته موجودی و اجرت و درصد خودش را می‌خواهد و خارج از دو دامنهٔ خواسته‌شده است.
- ارسال تکه، ماندهٔ کامل قطعه‌های انتخاب‌شده را یکجا خارج می‌کند. بازهٔ وزن فقط برای پیدا کردن تکه‌هاست.
- پولی کردن ماندهٔ گرمیِ ازقبل (علامت * زرین) جدا پیاده نشده. خرید همان لحظه با مظنه یا مبلغ کل انجام می‌شود.
- قیمت سکه و مظنهٔ دادهٔ نمونه، عدد تمرینی است نه نرخ بازار.
- ارز، چک، کارساخته، جواهر و بارکد در این نسخه نیستند.

## دادهٔ نمونه

طلافروشی رضایی با افتتاحیه، یک آبشدهٔ راکد، خرید متفرقه با مظنه، خرید ۷۰٫۵۳ گرم در برابر بدهی قبلی، یک متفرقهٔ جواب‌داده‌شده با کسر ذوب، یک آبشدهٔ هنوز شرطی، یک ذوب، قیچی، خرید و فروش امامی، امانت نیم‌سکه، و یک واریز بانکی ساخته شده تا صفحه‌ها خالی نباشند.

# Daftar-e Ayar

A multi-user ledger for an Iranian gold shop, limited to melted and scrap gold (plus conditional assay and melting) and counted coins. It is a simplified working slice of those parts of Zarrin 64, with a Persian RTL interface, Jalali dates, Persian digits, and amounts in rial and toman.

## Run

Requires Node.js 20+ and PostgreSQL 16.

```bash
docker compose up -d
cp .env.example .env
npm install
npm run setup
npm run dev
```

Open http://127.0.0.1:43123. In production the server listens on `0.0.0.0` and `PORT` (43123 when `PORT` is unset). Calculation tests: `npm test`.

## Render

`render.yaml` defines a free Node web service and a free Postgres database in Frankfurt. `DATABASE_URL` comes from the database. `COOKIE_SECURE=1` and `NODE_ENV=production` are set on the service. Free instances cannot use a pre-deploy command, so each start runs `prisma migrate deploy` and `tsx prisma/seed.ts` before `npm run start`. The seed returns immediately when any user already exists. The build installs devDependencies even though `NODE_ENV` is production, because `next build` needs TypeScript.

Build command: `npm install --include=dev && npx prisma generate && npm run build`

Start command: `npx prisma migrate deploy && npx tsx prisma/seed.ts && npm run start`

Demo logins: admin `reza` / `ayar750`, operator `sara` / `ayar740`. Admins manage users and settings and may void a document. Operators record documents, accounts, and the daily quote. Every document stores who recorded it.

## Rules implemented

A positive balance is a debit: the party owes the shop. A negative balance is a credit. For cash and bank accounts the same positive number is the cash on hand.

750-equivalent weight is `round(scale × ayar / 750, 3 decimals)`, half up. The book standard is 750. Scrap defaults to ayar 740, configurable by an admin. Melted bars default to 750 when ayar is omitted. Conditional metal is booked at a provisional 750 until the assay result.

The mesghal quote is the price of one 4.6083 g unit at ayar 705. One gram of 750 gold costs that quote divided by `4.6083 × 705 / 750` (4.331802). A typed total overrides the quote. Buying or selling for money does not move the party's gram balance; a plain receipt or issue does. A trade can be settled partly in cash, partly through one or more banks, and partly in gold or coins; the remainder stays on the person's account. A transfer only moves money between the cash box and the banks. A partial issue leaves the remainder in stock.

Assay replaces the provisional 750. An optional melting deduction is spread across the stock remainder and any pieces already issued, in proportion to scale. If the original receipt hit a gram account, that account takes the balancing difference. A monetary purchase does not push a gram adjustment back to the seller.

Melting pays metal into an expense account and receives the bar back from it. A debit left on that account is shop loss.

Coin buy and sell move inventory and rial value, not the party's coin count. Coin receive and pay move both inventory and the party's coin count. A price on receive or pay is a fee. Stock cannot go negative.

Shop-owned gold is physical 750 weight, plus gram receivables, minus gram payables and the investor's gram credit. Monetary purchases increase it. Custody transfers do not. Melting loss has already left the physical stock and is also visible on the melt account.

## Assumptions

Weights are kept to three decimals so splits do not drop milligrams; the last piece absorbs rounding. The mesghal factor is the exact 4.6083 × 705 / 750 ratio. A web-service note that divides by 10 was treated as a catalog slip. Melting deduction is allowed on any conditional piece and is shared by weight. Account group cannot be changed after creation. Converting scrap into finished jewelry is out of scope, because finished pieces are a third domain. Bulk send issues the full remainder of each selected piece. Converting an existing gram balance into money (Zarrin's pooli asterisk) is not a separate document; price is captured on the purchase itself. Seed prices are exercises, not a live market. Currency, cheques, finished jewelry, and barcodes are not in this version.
