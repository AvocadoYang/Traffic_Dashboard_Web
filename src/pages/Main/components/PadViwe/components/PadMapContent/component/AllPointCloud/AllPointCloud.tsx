import { memo } from "react";
import useName from "@/api/useAmrName";
import { amrId2ColorRainbow } from "@/utils/utils";
import PointCloudLayer from "./components/PointCloudLayer";

const MemoizedPointCloudLayer = memo(
  PointCloudLayer,
  (prevProps, nextProps) => prevProps.amrId === nextProps.amrId,
);

const AllPointCloud = () => {
  const { data } = useName();

  if (!data) return null;

  const amrs = data.isSim
    ? data.amrs.filter((v) => v.isReal === false)
    : data.amrs.filter((v) => v.isReal);

  return (
    <>
      {amrs.map(({ amrId }) => (
        
        <MemoizedPointCloudLayer
          amrId={amrId}
          color={amrId2ColorRainbow(amrId)}
          key={amrId}
        />
      ))}
    </>
  );
};

export default memo(AllPointCloud);
