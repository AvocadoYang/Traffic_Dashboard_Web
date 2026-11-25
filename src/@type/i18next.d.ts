import "i18next";

// 刻意不宣告 resources: 專案大量用動態 key (`t(\`xxx.${id}\`)`) 和元件外的全域 t,
// 嚴格的 key 型別會讓這些全部報錯, 所以 t() 接受任意字串、回傳 string。
// 執行期: 預設命名空間 "translation", 語言 tw / en (見 src/i18n/i18n.ts)。
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
  }
}
