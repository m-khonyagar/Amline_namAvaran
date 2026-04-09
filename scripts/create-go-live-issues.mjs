/**
 * Creates GitHub milestone "Go-Live v1" and issues for each GL-P* / GL-PX* story
 * from docs/GO_LIVE_SPRINT_BACKLOG.md (idempotent: skips if title prefix exists).
 *
 * Requires: gh CLI, authenticated. Run from repo root:
 *   node scripts/create-go-live-issues.mjs
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = "m-khonyagar/Amline_namAvaran";
const MILESTONE_TITLE = "Go-Live v1";

/** @type {{ id: string; epic: string; phaseLabel: string; sprint: string; owner: string; deps: string; title: string; dod: string }[]} */
const STORIES = [
  {
    id: "GL-P0-01",
    epic: "E0",
    phaseLabel: "phase/P0",
    sprint: "S1",
    owner: "محصول",
    deps: "—",
    title: "تأیید رسمی جدول «داخل v1» و حذف ابهام از مسیرهای UI/API",
    dod: "جدول v1 در roadmap بدون ردیف مبهم «بعداً»؛ در صورت نیاز footnote با تاریخ",
  },
  {
    id: "GL-P0-02",
    epic: "E0",
    phaseLabel: "phase/P0",
    sprint: "S1",
    owner: "محصول",
    deps: "GL-P0-01",
    title: "پر کردن جدول مالکیت (نام یا تیم قطعی)",
    dod: "هر سلول «نام / تیم» پر؛ کانال تصمیم‌گیری مشخص",
  },
  {
    id: "GL-P0-03",
    epic: "E0",
    phaseLabel: "phase/P0",
    sprint: "S1",
    owner: "Backend + محصول",
    deps: "—",
    title: "ثبت تصمیم SSOT برای API و مسیر dev-mock",
    dod: "GIT_AND_BACKEND_POLICY.md + DEV_MOCK_GAP_MATRIX.md به‌روز و مرجع",
  },
  {
    id: "GL-P1-01",
    epic: "E1",
    phaseLabel: "phase/P1",
    sprint: "S1",
    owner: "Frontend + Backend",
    deps: "—",
    title: "سبز بودن openapi-contract + admin-ui-quality + backend-test روی main",
    dod: "آخرین run CI سبز؛ در صورت شکست runbook در LOCAL_DEV.md",
  },
  {
    id: "GL-P1-02",
    epic: "E1",
    phaseLabel: "phase/P1",
    sprint: "S1",
    owner: "Frontend",
    deps: "—",
    title: "اجرای assert-safe-production-env در مسیر release و مستند بودن",
    dod: "prebuild در admin-ui؛ مستند در ENV_SECRETS_INVENTORY.md",
  },
  {
    id: "GL-P1-03",
    epic: "E1",
    phaseLabel: "phase/P1",
    sprint: "S2",
    owner: "QA + Frontend",
    deps: "GL-P1-01",
    title: "E2E محلی سبز: npm run test:e2e در admin-ui قبل از هر release نامزد",
    dod: "نتیجه در PR یا گزارش تست پیوست شود",
  },
  {
    id: "GL-P1-04",
    epic: "E1",
    phaseLabel: "phase/P1",
    sprint: "S2",
    owner: "QA",
    deps: "GL-P2-05، GL-P2-06",
    title: "E2E علیه URL استیجینگ (ورود → داشبورد حداقل)",
    dod: "تست ثبت‌شده با زمان‌بندی؛ اسکرین یا لاگ request_id",
  },
  {
    id: "GL-P2-01",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S1",
    owner: "DevOps",
    deps: "GL-P0-02",
    title: "محیط staging: Postgres، secret جدا، دسترسی محدود",
    dod: "مستند اتصال در ENV_MATRIX.md؛ بدون secret در git",
  },
  {
    id: "GL-P2-02",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S1–S2",
    owner: "DevOps + Backend",
    deps: "GL-P2-01",
    title: "Deploy خودکار یا runbook یک‌صفحه‌ای backend روی staging",
    dod: "Health endpoint سبز؛ نسخه commit قابل مشاهده",
  },
  {
    id: "GL-P2-03",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S2",
    owner: "Backend",
    deps: "GL-P2-01",
    title: "Migrationها (Alembic) روی staging بدون دادهٔ تولیدی واقعی در repo",
    dod: "pytest یا اسکریپت verify روی staging سبز",
  },
  {
    id: "GL-P2-04",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S2",
    owner: "Backend",
    deps: "GL-P2-02",
    title: "جایگزینی وابستگی mock برای جریان ورود (admin otp/login، auth/me)",
    dod: "پاسخ‌ها با OpenAPI منطبق؛ openapi:refresh به‌روز",
  },
  {
    id: "GL-P2-05",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S2–S3",
    owner: "Backend",
    deps: "GL-P2-04",
    title: "پوشش هستهٔ v1 طبق جدول roadmap روی staging",
    dod: "ماتریس: مسیر UI ↔ endpoint ↔ تست دستی یا خودکار",
  },
  {
    id: "GL-P2-06",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S2",
    owner: "Frontend + DevOps",
    deps: "GL-P2-02",
    title: "admin-ui روی staging به VITE_API_URL استیجینگ؛ بدون MSW در build استقرار",
    dod: "Build استقرار بدون VITE_USE_MSW=true",
  },
  {
    id: "GL-P2-07",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S3",
    owner: "Backend + DevOps",
    deps: "GL-P2-05",
    title: "اندازه‌گیری حداقلی: p95 و نرخ خطا برای ۲–۳ مسیر بحرانی",
    dod: "لاگ یا APM؛ عدد ثبت در تیکت",
  },
  {
    id: "GL-P2-08",
    epic: "E2",
    phaseLabel: "phase/P2",
    sprint: "S3",
    owner: "Frontend",
    deps: "—",
    title: "مهاجرت تدریجی axios → fetchJson در ۳ مسیر پرتکرار",
    dod: "PR جدا؛ رفتار خطا و X-Request-Id یکسان",
  },
  {
    id: "GL-P3-01",
    epic: "E3",
    phaseLabel: "phase/P3",
    sprint: "S4",
    owner: "Backend",
    deps: "GL-P2-04",
    title: "OTP + rate limit روی /admin/otp/send در staging و prod",
    dod: "تست سوءاستفاده پایه؛ threshold مستند",
  },
  {
    id: "GL-P3-02",
    epic: "E3",
    phaseLabel: "phase/P3",
    sprint: "S4",
    owner: "Backend + Frontend",
    deps: "GL-P3-01",
    title: "نشست امن (httpOnly یا معادل طبق HTTPONLY_AUTH.md)",
    dod: "بدون ذخیرهٔ توکن حساس در localStorage برای flow اصلی",
  },
  {
    id: "GL-P3-03",
    epic: "E3",
    phaseLabel: "phase/P3",
    sprint: "S4",
    owner: "Frontend",
    deps: "GL-P1-02",
    title: "اثبات عدم VITE_ENABLE_DEV_BYPASS=true در artifact پروداکشن",
    dod: "اسکریپت prebuild یا CI قفل کننده",
  },
  {
    id: "GL-P3-04",
    epic: "E3",
    phaseLabel: "phase/P3",
    sprint: "S4",
    owner: "Backend",
    deps: "GL-P2-05",
    title: "RBAC enforce سمت سرور برای نقش‌های v1",
    dod: "تست منفی: کاربر بدون مجوز 403",
  },
  {
    id: "GL-P4-01",
    epic: "E4",
    phaseLabel: "phase/P4",
    sprint: "S4–S5",
    owner: "DevOps",
    deps: "GL-P2-01",
    title: "تفکیک متغیرها و secret بین staging و production",
    dod: "جدول در ENV_MATRIX.md کامل",
  },
  {
    id: "GL-P4-02",
    epic: "E4",
    phaseLabel: "phase/P4",
    sprint: "S5",
    owner: "همه",
    deps: "—",
    title: "CI سبز قبل از merge (سیاست GIT_AND_BACKEND_POLICY.md)",
    dod: "branch protection + وضعیت required",
  },
  {
    id: "GL-P4-03",
    epic: "E4",
    phaseLabel: "phase/P4",
    sprint: "S5",
    owner: "Frontend + Backend",
    deps: "—",
    title: "Sentry یا معادل + correlation با X-Request-Id در مسیرهای بحرانی",
    dod: "حداقل یک خطای تستی در staging قابل ردیابی end-to-end",
  },
  {
    id: "GL-P4-04",
    epic: "E4",
    phaseLabel: "phase/P4",
    sprint: "S5",
    owner: "DevOps",
    deps: "GL-P4-01",
    title: "Runbook deploy production (گام‌ها، رول‌بک، تماس مسئول)",
    dod: "یک صفحه در docs/ یا ویکی داخلی لینک از README",
  },
  {
    id: "GL-P5-01",
    epic: "E5",
    phaseLabel: "phase/P5",
    sprint: "S5",
    owner: "DevOps",
    deps: "GL-P2-01",
    title: "بک‌آپ زمان‌بندی‌شدهٔ DB + نگهداری off-site",
    dod: "زمان‌بندی و محل مستند",
  },
  {
    id: "GL-P5-02",
    epic: "E5",
    phaseLabel: "phase/P5",
    sprint: "S5",
    owner: "DevOps",
    deps: "GL-P5-01",
    title: "یک بار restore آزمایشی (حتی روی استیج)",
    dod: "گزارش با زمان بازیابی",
  },
  {
    id: "GL-P5-03",
    epic: "E5",
    phaseLabel: "phase/P5",
    sprint: "S5",
    owner: "محصول",
    deps: "—",
    title: "SLA سبک داخلی (زمان پاسخ پشتیبانی / uptime هدف)",
    dod: "سند یک صفحه؛ قابل ابلاغ به مشتری داخلی",
  },
  {
    id: "GL-P5-04",
    epic: "E5",
    phaseLabel: "phase/P5",
    sprint: "S5",
    owner: "Frontend + محصول",
    deps: "GL-P2-05",
    title: "پیام خطا و empty state شفاف در مسیرهای پرتکرار v1",
    dod: "چک‌لیست UX روی ۵ صفحهٔ پرترافیک",
  },
  {
    id: "GL-P5-05",
    epic: "E5",
    phaseLabel: "phase/P5",
    sprint: "S5",
    owner: "محصول",
    deps: "—",
    title: "کانال پشتیبانی (ایمیل/تیکت) و مالک پاسخ",
    dod: "در محصول یا سند عمومی قابل پیدا شدن",
  },
  {
    id: "GL-PX-01",
    epic: "PX",
    phaseLabel: "phase/PX",
    sprint: "پس از ثبات API",
    owner: "Frontend",
    deps: "GL-P2-04+",
    title: "amline-ui: E2E auth + یک جریان اصلی سبز پس از ثبات auth روی staging",
    dod: "E2E auth + یک جریان اصلی سبز",
  },
  {
    id: "GL-PX-02",
    epic: "PX",
    phaseLabel: "phase/PX",
    sprint: "پس از backend",
    owner: "Frontend",
    deps: "consultant routes on real API",
    title: "consultant-ui: مسیرهای مشاور طبق قرارداد + خطا روی backend واقعی",
    dod: "مسیرهای مشاور طبق قرارداد + خطا",
  },
  {
    id: "GL-PX-03",
    epic: "PX",
    phaseLabel: "phase/PX",
    sprint: "موازی",
    owner: "Frontend + محتوا",
    deps: "—",
    title: "site (مارکتینگ): deploy و محتوا؛ مستقل از GL-P2",
    dod: "deploy و محتوا؛ بدون وابستگی به هستهٔ API",
  },
];

const BASE =
  "https://github.com/m-khonyagar/Amline_namAvaran/blob/main/docs/GO_LIVE_SPRINT_BACKLOG.md";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

function shQuiet(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (e) {
    return null;
  }
}

function ensureMilestone() {
  const list = sh(`gh api repos/${REPO}/milestones --jq ".[].title"`);
  if (list.split("\n").map((t) => t.trim()).includes(MILESTONE_TITLE)) {
    console.log(`Milestone exists: ${MILESTONE_TITLE}`);
    return;
  }
  sh(
    `gh api --method POST repos/${REPO}/milestones -f title=${JSON.stringify(MILESTONE_TITLE)} -f state=open`,
  );
  console.log(`Created milestone: ${MILESTONE_TITLE}`);
}

function ensurePhasePXLabel() {
  shQuiet(
    `gh label create "phase/PX" --repo ${REPO} --color "5319E7" --description "Parallel tracks (amline-ui, consultant, site)"`,
  );
}

function listExistingTitles() {
  const raw = sh(
    `gh issue list --repo ${REPO} --state all --limit 500 --json title`,
  );
  return new Set(JSON.parse(raw).map((x) => x.title));
}

function bodyFor(s) {
  return [
    `## ${s.id}`,
    ``,
    `**Epic:** ${s.epic}  `,
    `**Sprint (پیشنهادی):** ${s.sprint}  `,
    `**مالک (نقش):** ${s.owner}  `,
    `**وابستگی:** ${s.deps}`,
    ``,
    `### معیار پذیرش (DoD)`,
    s.dod,
    ``,
    `### مرجع`,
    `- [GO_LIVE_SPRINT_BACKLOG.md](${BASE})`,
    `- [PLATFORM_GO_LIVE_ROADMAP.md](https://github.com/m-khonyagar/Amline_namAvaran/blob/main/docs/PLATFORM_GO_LIVE_ROADMAP.md)`,
    ``,
    `_ایجادشده با scripts/create-go-live-issues.mjs_`,
  ].join("\n");
}

function main() {
  ensurePhasePXLabel();
  ensureMilestone();
  const existing = listExistingTitles();
  let created = 0;
  let skipped = 0;

  for (const s of STORIES) {
    const fullTitle = `[${s.id}] ${s.title}`;
    const prefix = `[${s.id}]`;
    const has = [...existing].some((t) => t.startsWith(prefix));
    if (has) {
      console.log(`Skip (exists): ${prefix}`);
      skipped++;
      continue;
    }

    const tmp = path.join(process.cwd(), ".go-live-issue-body.tmp");
    fs.writeFileSync(tmp, bodyFor(s), "utf8");

    const labelArgs = ["go-live", s.phaseLabel]
      .map((l) => `--label ${JSON.stringify(l)}`)
      .join(" ");
    sh(
      `gh issue create --repo ${REPO} --title ${JSON.stringify(fullTitle)} --body-file ${JSON.stringify(tmp)} ${labelArgs} --milestone ${JSON.stringify(MILESTONE_TITLE)}`,
    );
    fs.unlinkSync(tmp);
    existing.add(fullTitle);
    console.log(`Created: ${fullTitle}`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, skipped: ${skipped}`);
}

main();
