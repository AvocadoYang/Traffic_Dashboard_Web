import {
  InfoWrap,
  CardRow1,
  CardRow2,
  CardRow3,
  CardRow4,
} from "./components/WrapAndLists";
import {
  FileOutlined,
  CloseSquareOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import "./mission_info.css";

const style: React.CSSProperties = {
  "--clr": "red",
} as React.CSSProperties;

const Card: React.FC = () => {
  return (
    <InfoWrap>
      <CardRow1>
        <div className="row1-file" style={{ width: "20%" }}>
          <FileOutlined />
        </div>
        <div className="row1-status" style={{ width: "60%" }}>
          {"測試任務是否"}
        </div>
        <div className="row1-cancel" style={{ width: "20%" }}>
          <CloseSquareOutlined />
        </div>
      </CardRow1>
      <CardRow2>
        <div className="row2-src">
          <span className="row2-id">12334</span>
          <span className="row2-describe">{"start load"}</span>
        </div>
        <span className="row2-icon">
          <ArrowRightOutlined />
        </span>
        <div className="row2-dis">
          <span className="row2-id">23123</span>
          <span className="row2-describe">{"end offload"}</span>
        </div>
      </CardRow2>
      <CardRow3>
        <div className="row3-tittle">AMR</div>
        <div className="row3-content">
          <div className="row3-content-color" style={style}></div>
          <div className="row3-content-num">#車號 32</div>
          <div className="row3-content-id">ID: anfa-ps14-16-001</div>
        </div>
      </CardRow3>
      <CardRow4>
        <div className="row4-tittle">CURRENT STATUS</div>
        <div className="row4-content">Loc: 23004</div>
      </CardRow4>
    </InfoWrap>
  );
};

export default Card;
