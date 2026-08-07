import React, { FC, useEffect, useRef, useState } from "react";
import { Modal, Input, Slider, Button, Popconfirm, message } from "antd";
import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";
import client from "@/api/axiosClient";
import { resolveSoundUrl, type SoundRow } from "./useSound";

const IntroText = styled.p`
  color: #475467;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 8px 0;
`;

const IntroList = styled.ul`
  color: #475467;
  font-size: 14px;
  line-height: 1.6;
  margin: 0 0 8px 0;
  padding-left: 20px;
`;

const Hint = styled.p`
  color: #98a2b3;
  font-size: 13px;
  margin: 0 0 20px 0;
`;

const FieldBlock = styled.div`
  margin-bottom: 16px;
`;

const FieldLabel = styled.div`
  font-weight: 700;
  color: #1e2a4a;
  margin-bottom: 6px;
`;

const PlayRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

interface EditSoundModalProps {
  open: boolean;
  sound: SoundRow | null;
  onClose: () => void;
}

export const EditSoundModal: FC<EditSoundModalProps> = ({
  open,
  sound,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [volume, setVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queryClient = useQueryClient();

  const readOnly = sound?.created_by === "MiR";

  useEffect(() => {
    if (!sound) return;
    setName(sound.name);
    setNote(sound.note ?? "");
    setVolume(sound.volume ?? 100);
  }, [sound]);

  // stop any preview playback and reset when the modal closes / swaps sound
  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [open, sound?.id]);

  const saveMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      name: string;
      note: string;
      volume: number;
    }) => client.post("api/setting/edit-sound", payload),
    onSuccess: () => {
      message.success("已儲存");
      queryClient.invalidateQueries({ queryKey: ["all-sound"] });
      onClose();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? "儲存失敗");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => client.post("api/setting/delete-sound", { id }),
    onSuccess: () => {
      message.success("已刪除");
      queryClient.invalidateQueries({ queryKey: ["all-sound"] });
      onClose();
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? "刪除失敗");
    },
  });

  // TODO: the backend route this calls is a stub — it needs to be wired
  // up to whatever bridge command actually tells the robot to play a
  // sound (see the TODO in configRouter.ts's /play-sound-on-robot).
  const playOnRobotMutation = useMutation({
    mutationFn: (id: string) =>
      client.post("api/setting/play-sound-on-robot", { id }),
    onError: (err: any) => {
      message.error(err?.response?.data?.message ?? "無法在機器人上播放");
    },
  });

  const handleListen = () => {
    if (!sound?.media_path) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    const audio = audioRef.current ?? new Audio();
    audio.src = resolveSoundUrl(sound.media_path);
    audio.volume = Math.min(1, Math.max(0, volume / 100));
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
    audio.play().catch((err) => {
      console.error("播放聲音失敗", audio.src, err);
      message.error("無法播放這個聲音，請打開瀏覽器 Console 看實際錯誤");
      setIsPlaying(false);
    });
    setIsPlaying(true);
  };

  if (!sound) return null;

  return (
    <Modal
      title="Edit sound"
      open={open}
      onCancel={onClose}
      footer={null}
      width={440}
    >
      <IntroText>
        To edit a sound, first edit the necessary information, then select{" "}
        <strong>Save</strong> to continue.
      </IntroText>
      <IntroList>
        <li>
          Select <strong>Play on robot</strong> to listen to the sound on the
          robot itself.
        </li>
        <li>
          Select <strong>Listen</strong> to listen to the sound on your
          computer.
        </li>
      </IntroList>
      <Hint>The volume can only be checked by playing the sound on the robot itself.</Hint>

      <FieldBlock>
        <FieldLabel>Name</FieldLabel>
        <Input
          value={name}
          disabled={readOnly}
          onChange={(e) => setName(e.target.value)}
        />
      </FieldBlock>

      <FieldBlock>
        <FieldLabel>Note</FieldLabel>
        <Input
          placeholder="Enter a note about the sound"
          value={note}
          disabled={readOnly}
          onChange={(e) => setNote(e.target.value)}
        />
      </FieldBlock>

      <FieldBlock>
        <FieldLabel>Volume (0 - 100)</FieldLabel>
        <Slider
          min={0}
          max={100}
          value={volume}
          disabled={readOnly}
          onChange={(v) => setVolume(v as number)}
          tooltip={{ formatter: (v) => `${v}%` }}
        />
      </FieldBlock>

      <PlayRow>
        <Button
          loading={playOnRobotMutation.isPending}
          onClick={() => playOnRobotMutation.mutate(sound.id)}
        >
          Play on robot
        </Button>
        <Button
          icon={isPlaying ? <PauseOutlined /> : <CaretRightOutlined />}
          onClick={handleListen}
        >
          Listen
        </Button>
      </PlayRow>

      <ModalFooter>
        <Button
          type="primary"
          disabled={readOnly}
          loading={saveMutation.isPending}
          onClick={() =>
            saveMutation.mutate({ id: sound.id, name, note, volume })
          }
        >
          Save
        </Button>
        {!readOnly && (
          <Popconfirm
            title="確定要刪除這個聲音嗎？"
            onConfirm={() => deleteMutation.mutate(sound.id)}
          >
            <Button danger loading={deleteMutation.isPending}>
              Delete
            </Button>
          </Popconfirm>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default EditSoundModal;