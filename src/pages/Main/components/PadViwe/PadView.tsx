import PadSider from "./components/PadSider";
import PadContent from "./components/PadContent";
import { memo } from "react";
import { useAtomValue } from "jotai";
import { Open2DMap } from "../../jotai.ts";
import PadMapContent from "./components/PadMapContent/PadMapContent";
const PadView = () => {
  const open2DMap = useAtomValue(Open2DMap);
  return (
    <>
      {open2DMap ? (
        <PadMapContent></PadMapContent>
      ) : (
        <>
          <PadSider></PadSider>
          <PadContent></PadContent>
        </>
      )}
    </>
  );
};

export default memo(PadView);
