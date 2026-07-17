import { useAtom } from "jotai";
import { JoystickAmrId } from "@/pages/Main/global/jotai";
import {useJoystickControl} from "@/sockets/useJoystickControl";
import {Button} from "antd";
import Joystick from "@/pages/Main/Car_Card/components/Joystick";

const JoystickPanel: React.FC = () => {
    const [armId, setArmId] = useAtom(JoystickAmrId);
    if (!armId) return null;

    return <JoystickPanelInner armId={armId} onClose={() => setArmId(null)} />

}

const JoystickPanelInner = ({armId, onClose}: {armId: string, onClose: () => void}) => {
    const joystick = useJoystickControl(armId);

    return (<Joystick size={160} stickSize={64} baseColor="#ccc" stickColor="#888"
                  onMove={joystick.onMove} onEnd={joystick.onEnd} />)
        
}

export default JoystickPanel;