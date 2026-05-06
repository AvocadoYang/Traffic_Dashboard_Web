import React, { FC } from 'react';
import { Carousel, Row, Col } from 'antd';
import styled from 'styled-components';
import { FireOutlined } from '@ant-design/icons';
import AnimatedNumber from "react-animated-numbers";

// 假設這是你定義的 Gauge 元件 props
interface GaugeProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}



declare const Gauge: FC<GaugeProps>;
declare const GlassCard: FC<{ title: string; children?: React.ReactNode }>;

// Gauge 資料型別
const gaugeItems: GaugeProps[] = [
  { label: "O₂", value: 80, unit: "%", color: "#1890ff" },
  { label: "CO", value: 20, unit: "ppm", color: "#fadb14" },
  { label: "H₂S", value: 5, unit: "ppm", color: "#52c41a" },
];

// groupBy 函式型別
const groupBy = <T,>(arr: T[], size: number): T[][] =>
  arr.reduce<T[][]>((acc, val, i) => {
    const pageIndex = Math.floor(i / size);
    if (!acc[pageIndex]) acc[pageIndex] = [];
    acc[pageIndex].push(val);
    return acc;
  }, []);

const StyledCarousel = styled(Carousel)`
  .slick-slide {
    padding: 12px;
  }
`;

const GaugeCarousel: FC = () => {
  const groupedGauges = groupBy<GaugeProps>(gaugeItems, 3);

  return (
    <Row gutter={[24, 24]}>
      <Col span={18}>
        <GlassCard title="氣體感測儀表">
          <StyledCarousel dots={false}>
            {groupedGauges.map((group, idx) => (
              <Row gutter={[24, 24]} key={`page-${idx}`}>
                {group.map((g, i) => (
                  <Col span={8} key={`${g.label}-${i}`}>
                    <Gauge label={g.label} value={g.value} unit={g.unit} color={g.color} />
                  </Col>
                ))}
              </Row>
            ))}
          </StyledCarousel>
        </GlassCard>
      </Col>
      <Col span={6}>
        <GlassCard title="熱源警告次數">
          <div style={{ textAlign: "center" }}>
            <AnimatedNumber
              includeComma
              animateToNumber={2}
              fontStyle={{ fontSize: 32, fontWeight: "bold" }}
              configs={[{ mass: 1, tension: 180, friction: 90 }]}
            />
            <div>
              <FireOutlined style={{ color: "#ff4d4f", fontSize: 20 }} />
            </div>
          </div>
        </GlassCard>
      </Col>
    </Row>
  );
};

export default GaugeCarousel;
