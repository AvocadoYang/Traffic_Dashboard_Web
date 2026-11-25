import { notification } from "antd";

type NotificationType = "success" | "info" | "warning" | "error";

const openNotificationWithIcon = (
  type: NotificationType,
  title: string,
  description: string,
  placement: "top" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight",
) => {
  notification[type]({
    title,
    description,
    placement,
  });
};

export { openNotificationWithIcon };
