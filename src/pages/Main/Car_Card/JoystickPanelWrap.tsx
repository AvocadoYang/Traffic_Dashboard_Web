import JoystickPanel from "./components/JoystickPanel";
import { usePermission } from "@/utils/permissions";

/** 功能權限: 沒有「手動遙控」的帳號不給搖桿 */
const JoystickPanelWrap = () => {
    const can = usePermission();
    return can("amr.manual") ? <JoystickPanel /> : null;
};

export default JoystickPanelWrap;