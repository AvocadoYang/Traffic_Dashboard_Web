import SparkMD5 from "spark-md5";

/** 字串的 MD5 (小寫 16 進位)。拿來把 id 雜湊成顏色種子, 結果跟之前用的 crypto-js 完全一樣。 */
export const md5 = (text: string): string => SparkMD5.hash(text);
