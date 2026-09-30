import { FC } from "react";
import { ArrowDownOutlined, ArrowUpOutlined } from "@ant-design/icons";
import { IconButton } from "./stepPrimitives";

type Props = {
  index: number;
  total: number;
  busy: boolean;
  onMove: (from: number, to: number) => void;
};

/**
 * 窄螢幕的排序方式。手指要拖一個 28px 的把手太難,所以卡片改用上下移動,
 * 最後呼叫的還是同一個 moveStep。
 */
const StepMoveButtons: FC<Props> = ({ index, total, busy, onMove }) => (
  <>
    <IconButton
      type="button"
      disabled={busy || index === 0}
      onClick={() => onMove(index, index - 1)}
    >
      <ArrowUpOutlined />
    </IconButton>
    <IconButton
      type="button"
      disabled={busy || index === total - 1}
      onClick={() => onMove(index, index + 1)}
    >
      <ArrowDownOutlined />
    </IconButton>
  </>
);

export default StepMoveButtons;
