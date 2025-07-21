import { FormInstance, Button, Form } from 'antd';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusOutlined, SaveOutlined } from '@ant-design/icons';
interface SubmitButtonProps {
  form: FormInstance
  isModel: boolean // 如果是model記得foot可以用來取代 但是關model要手動關閉
  onOk?: () => void
  text?: 'submit' | 'save'
}

const SubmitButton: React.FC<React.PropsWithChildren<SubmitButtonProps>> = ({
  form,
  isModel,
  onOk,
  text
}) => {
  const [submittable, setSubmittable] = useState<boolean>(false);
  const { t } = useTranslation();
  const values = Form.useWatch([], form);

  const btnText = text === 'save' ? t('utils.save') : t('utils.submit');
  const btnIcon = text === 'save' ? <PlusOutlined /> : <SaveOutlined />;

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(true))
      .catch(() => setSubmittable(false));
  }, [form, values]);

  if (isModel) {
    return (
      <Button
        variant="filled"
        color="primary"
        htmlType="submit"
        disabled={!submittable}
        onClick={onOk}
        icon={btnIcon}
      >
        {btnText}
      </Button>
    );
  }

  return (
    <Button
      variant="filled"
      color="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={onOk}
      icon={btnIcon}
    >
      {btnText}
    </Button>
  );
};

export default SubmitButton;
