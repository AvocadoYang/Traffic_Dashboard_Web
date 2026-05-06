import { Card, Col, ConfigProvider, Flex, Row } from "antd";
import styled from "styled-components";
import AnimatedNumber from "react-animated-numbers";
import {
    VideoCameraOutlined,
    AlertOutlined,
    DashboardOutlined,
    FireOutlined,
  } from "@ant-design/icons";
import { Children, useState } from "react";

const CardWrap: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => {
  return <Card size="small" title={<p style={{ color: 'white', textAlign: 'center'}}>{title}</p>}> {children}</Card>
}


const EventCount: React.FC = () => {
    const [prevValue, setPrevValue] = useState(0);


   return (
    <ConfigProvider
        theme={{
          components: {
            Card: {
              headerBg:'#000000'
            },
          },
        }}
      >
        <Row gutter={16} style={{ marginBottom: '20px'}}>
            <Col span={6} > 
                    <CardWrap title="熱源警告次數">
                        <div style={{ textAlign: "center" }}>
                        <AnimatedNumber
                            useThousandsSeparator
                            transitions={(index) =>{
                                // console.log(index)
                                return  {
                                    type: "spring",
                                    duration: 0.1,
                                  }
                            } }
                            animateToNumber={prevValue}
                            fontStyle={{
                              fontSize: 30,
                              color: "black",
                              fontWeight: 'bold'
                            }}

                        />
                        <div><AlertOutlined style={{ color: "#ff4d4f", fontSize: 15 }} /></div>
                        </div>
                    </CardWrap>
            </Col>
            <Col span={6}>
                <CardWrap title="熱源警告次數">
                            <div style={{ textAlign: "center" }}>
                            <AnimatedNumber
                            useThousandsSeparator
                            transitions={(index) =>{
                                // console.log(index)
                                return  {
                                    type: "spring",
                                    duration: 0.1,
                                  }
                            } }
                            animateToNumber={prevValue}
                            fontStyle={{
                              fontSize: 30,
                              color: "black",
                              fontWeight: 'bold'
                            }}

                        />
                            <div><VideoCameraOutlined style={{ color: "#ff4d4f", fontSize: 15 }} /></div>
                            </div>
                  </CardWrap>
            </Col>
            <Col span={6}>
                  <CardWrap title="熱源警告次數">
                            <div style={{ textAlign: "center" }}>
                            <AnimatedNumber
                            useThousandsSeparator
                            transitions={(index) =>{
                                // console.log(index)
                                return  {
                                    type: "spring",
                                    duration: 0.1,
                                  }
                            } }
                            animateToNumber={prevValue}
                            fontStyle={{
                              fontSize: 30,
                              color: "black",
                              fontWeight: 'bold'
                            }}

                        />
                            <div><FireOutlined style={{ color: "#ff4d4f", fontSize: 15 }} /></div>
                            </div>
                  </CardWrap>
            </Col>
            <Col span={6}>
                  <CardWrap title="熱源警告次數">
                        <div style={{ textAlign: "center" }}>
                        <AnimatedNumber
                            useThousandsSeparator
                            transitions={(index) =>{
                                // console.log(index)
                                return  {
                                    type: "spring",
                                    duration: 0.1,
                                  }
                            } }
                            animateToNumber={prevValue}
                            fontStyle={{
                              fontSize: 30,
                              color: "black",
                              fontWeight: 'bold'
                            }}

                        />
                        <div><DashboardOutlined style={{ color: "#ff4d4f", fontSize: 15 }} /></div>
                        </div>
                  </CardWrap>
            </Col>
        </Row>
        
        </ConfigProvider>
   )
}

export default EventCount;