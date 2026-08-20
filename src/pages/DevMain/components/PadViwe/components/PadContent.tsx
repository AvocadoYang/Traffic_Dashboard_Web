import {
  OpenCarCardInfo,
  OpenMissionCardInfo,
  viewBtn,
} from "@/pages/Main/global/jotai";
import { Layout } from "antd";
import { useAtom, useAtomValue } from "jotai";
import CardWrap from "./PadContentCards/CardWrap";
import { memo, useEffect, useState } from "react";

const dataIndex = [
  [{ key: "map_2D_view" }, { key: "map_3D_view" }],
  [
    { key: "quick_mission" },
    { key: "auto_mission" },
    { key: "new_mission" },
    // { key: 'input_mission' }
  ],
  [{ key: "mission_info" }, { key: "car_info" }],
];

const { Content } = Layout;
const PadContent = () => {
  const view = useAtomValue(viewBtn);
  const [displayArray, setDisplayArray] = useState<{ key: string }[]>(
    dataIndex[1],
  );

  useEffect(() => {
    switch (view) {
      case 0:

        setDisplayArray(dataIndex[view]);
        break;
      case 1:

        setDisplayArray(dataIndex[view]);
        break;
      case 2:

        setDisplayArray(dataIndex[view]);
        break;
      case 3:

        break;
      default:
        console.log("error");
        break;
    }
  }, [view]);

  return (
    <Content className="pad-content" style={{ overflowY: "scroll" }}>
      {(() => {
 

        return displayArray.map((card) => {
          return (
            <CardWrap
              key={card.key}
              id={card.key}
          
            ></CardWrap>
          );
        });
      })()}
    </Content>
  );
};

export default memo(PadContent);
