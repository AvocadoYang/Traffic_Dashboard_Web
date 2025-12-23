import React, { useState, useRef, useEffect, useMemo } from "react";
import { Layout, Form, Splitter, Flex } from "antd";
import Header from "../../components/Header";
import { ZoomPad, Sider, BKBtn, ToolComponents } from "./components";
import { useResetSiderSwitch } from "./hooks";
import "./setting.css";
import { DndContext } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import { getMoveIndex } from "./utils/utils";
import { toolbarState } from "./components/siderElement";
import { useIsMobile } from "@/hooks/useIsMoblie";
import MapView from "./mapComponents/MapView";
import useMap from "@/api/useMap";
const { Content } = Layout;

const INITIAL_VIEW = {
  scale: 1.5,
  scrollX: 1500,
  scrollY: 3020,
};

const Setting: React.FC = () => {
  const mapRef = useRef(null);
  const [hasOpenTool, setHasOpenTool] = useState(false);
  const mapWrapRef = useRef(null);
  const [locationPanelForm] = Form.useForm();
  const { isMobile } = useIsMobile();
  const [roadPanelForm] = Form.useForm();
  const [zonePanelForm] = Form.useForm();
  const [dataList, setDataList] = useState(toolbarState);
  const [scale, setScale] = useState(1);
  const currentMapInfo = useMap();

  const [splitterSize, setSplitterSize] = useState<number[] | string[]>([
    "0%",
    "100%",
  ]);

  const dragEndEvent = (dragItem) => {
    setDataList((prevDataList) => {
      const moveDataList = prevDataList;
      const { activeIndex, overIndex } = getMoveIndex(moveDataList, dragItem);
      const newDataList = arrayMove(moveDataList, activeIndex, overIndex);
      return newDataList;
    });
  };

  const dndContextMemo = useMemo(() => {
    return (
      <DndContext
        onDragEnd={dragEndEvent}
        modifiers={[restrictToParentElement]}
      >
        <SortableContext
          items={dataList.map((c) => c.key)}
          strategy={verticalListSortingStrategy}
        >
          <Flex
            vertical
            gap="middle"
            align="start"
            className="attrs"
            style={{ padding: "1em" }}
          >
            {
              <ToolComponents
                locationPanelForm={locationPanelForm}
                roadPanelForm={roadPanelForm}
                zonePanelForm={zonePanelForm}
                dataList={dataList}
              />
            }
          </Flex>
        </SortableContext>
      </DndContext>
    );
  }, [dataList, locationPanelForm]);

  useEffect(() => {
    if (hasOpenTool) {
      setSplitterSize(["30%", "100%"]);
    } else {
      setSplitterSize(["0%", "100%"]);
    }
  }, [hasOpenTool]);

  const updateSize = (size) => {
    setSplitterSize(size);
  };

  useResetSiderSwitch();

  // useEffect(() => {
  //   const container = mapWrapRef.current;
  //   if (!container) return;

  //   const handleScroll = () => {
  //     const scrollX = container.scrollLeft;
  //     const scrollY = container.scrollTop;
  //     console.log("當前捲動位置:", { scrollX, scrollY });
  //     // 你可以將這兩個值存在 useState 中，或是傳給其他組件使用
  //   };

  //   container.addEventListener("scroll", handleScroll);
  //   return () => container.removeEventListener("scroll", handleScroll);
  // }, [mapWrapRef]);

  useEffect(() => {
    // 確保 DOM 已經渲染
    if (mapWrapRef.current && currentMapInfo) {
      // 直接設定 DOM 的捲動位置
      setTimeout(() => {
        ((mapWrapRef.current.scrollLeft = currentMapInfo.data?.scrollX),
          (mapWrapRef.current.scrollTop = currentMapInfo.data?.scrollY),
          setScale(currentMapInfo.data?.scale));
      }, 100);
    }
  }, []);

  return (
    <>
      <Layout style={{ height: `${isMobile ? "100dvh" : "100%"}` }}>
        <Header isMobile={isMobile}></Header>
        <Content>
          <Layout style={{ height: "100%", width: "100%" }}>
            <Sider setHasOpenTool={setHasOpenTool} />
            <Content
              style={{
                backgroundColor: "#f5f5f5",
              }}
            >
              <Splitter onResize={updateSize}>
                <Splitter.Panel
                  size={splitterSize[0]}
                  collapsible={hasOpenTool ? true : false}
                  resizable={hasOpenTool ? true : false}
                  style={{ overflowX: "hidden" }}
                >
                  {dndContextMemo}
                </Splitter.Panel>
                <Splitter.Panel
                  size={splitterSize[1]}
                  style={{ overflow: "hidden", backgroundColor: "#f5f5f5" }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: "100%",
                      overflow: "scroll",
                    }}
                    draggable={false}
                    ref={mapWrapRef}
                  >
                    <MapView
                      scale={scale}
                      mapRef={mapRef}
                      mapWrapRef={mapWrapRef}
                      roadPanelForm={roadPanelForm}
                      locationPanelForm={locationPanelForm}
                      zonePanelForm={zonePanelForm}
                    ></MapView>
                  </div>
                </Splitter.Panel>
              </Splitter>
              <ZoomPad setScale={setScale}></ZoomPad>
              <BKBtn></BKBtn>
            </Content>
          </Layout>
        </Content>
      </Layout>
    </>
  );
};

export default Setting;
