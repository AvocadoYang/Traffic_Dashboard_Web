export enum EndpointStatus {
  /**未知 (應不發生) */
  UNDEFINED = 0,

  /**此地點未上線 dead point */
  OFFLINE = 10,

  /**無貨 可被預約  */
  EMPTY_AVAILABLE_FOR_RECEIVING = 20,

  /** 無貨物  已被預約*/
  EMPTY_ITEM_RESERVED = 30,

  /**無貨  可被預約 no use */
  EMPTY_DEFECT_ITEM_RESERVED = 31,

  /**無貨 無法被預約  */
  EMPTY_NOT_AVAILABLE = 40,

  /**已有貨物，可被車輛取走 */
  OCCUPIED_AVAILABLE_FOR_PICKUP = 50,

  /**已有貨物 被車輛預約  */
  OCCUPIED_ITEM_PICKUP_RESERVED = 60,

  /**已有貨物， 但目前不可用 */
  OCCUPIED_NOT_AVAILABLE = 70,
}
