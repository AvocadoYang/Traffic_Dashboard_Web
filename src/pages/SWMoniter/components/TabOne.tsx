import { Row, Col, Flex} from "antd"
import { Gauge, EventCount, EventTable, StreamWrap } from "./subComponents";
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useRef } from "react";


const TabOne: React.FC = () => {
    const wrapRef = useRef<HTMLDivElement>(null);

    const scrollBy = (offset: number) => {
        if (wrapRef.current) {
          wrapRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
      };
    
    return (<>
                <Row gutter={16} style={{ height: '85vh'}}>
                    <Col span={9} style={{ height: '100%'}}>
                        <>
                            <div className="carousel-wrap">
                                <div className="gauge-wrap" ref={wrapRef}>
                                    <Gauge label="O₂" value={80} unit="%" color="#1890ff"></Gauge>

                                    <Gauge label="CO" value={20} unit="ppm" color="#fadb14"></Gauge>

                                    <Gauge label="H₂S" value={5} unit="ppm" color="#52c41a"></Gauge>
                                
                                    <Gauge label="H₂S" value={5} unit="ppm" color="#52c41a"></Gauge>
                        
                                    <Gauge label="H₂S" value={5} unit="ppm" color="#52c41a"></Gauge>
                                </div>
                                <LeftOutlined className="outlined left" onClick={() => scrollBy(-wrapRef.current!.offsetWidth)}/>
                                <RightOutlined className="outlined right" onClick={() => scrollBy(wrapRef.current!.offsetWidth)} />
                            </div>
                            <EventTable></EventTable>
                        </>
                    </Col>
                    <Col span={15}>
                    
                        <EventCount></EventCount>
                        <StreamWrap amrId="222"></StreamWrap>
                       
                    </Col>
                </Row>
            </>
    )
}

export default TabOne;