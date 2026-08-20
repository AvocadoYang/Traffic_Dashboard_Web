import AMR from "./components/AMR";
import { memo } from "react";
import useName from "@/api/useAmrName";

const MemoizedAMR = memo(AMR, (prevProps, nextProps) => {
  return prevProps.amrId === nextProps.amrId;
});

const AllAMRs = () => {
  const { data } = useName();

  if (!data) return null;
  return (
    <>
      {data.isSim
        ? data.amrs
            .filter((v) => v.isReal === false)
            .map(({ amrId }) => <MemoizedAMR amrId={amrId} key={amrId} />)
        : data.amrs
            .filter((v) => v.isReal)
            .map(({ amrId }) => <MemoizedAMR amrId={amrId} key={amrId} />)}
    </>
  );
};

export default AllAMRs;
