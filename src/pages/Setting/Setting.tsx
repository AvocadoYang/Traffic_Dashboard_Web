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
import { centerMap } from "@/utils/gloable";
import { useAtomValue } from "jotai";
const { Content } = Layout;

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
  const cm = useAtomValue(centerMap);
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
    // 1. 提早 return 確保邏輯乾淨
    if (!mapWrapRef.current || !currentMapInfo?.data) return;

    const { scrollX, scrollY, scale } = currentMapInfo.data;

    // 2. 先將 Ref 存入局部變數，解決 setTimeout 內的 null 檢查問題
    const container = mapWrapRef.current;

    const timer = setTimeout(() => {
      // 3. 使用條件判斷或非空斷言確保數值存在
      if (scrollX !== undefined) container.scrollLeft = scrollX;
      if (scrollY !== undefined) container.scrollTop = scrollY;
      if (scale !== undefined) {
        setScale(scale);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [ cm]);

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
