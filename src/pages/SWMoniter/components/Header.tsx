import { Flex, Layout } from "antd"
const { Header } = Layout;
import { RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import ClockComponent from "./ClockComponent";
//rgb(33, 33, 34)
const PageHeader = () => {
    const navigate = useNavigate();
    return  (
    <Header style={{ background: "#f9f9f9", padding: "3px 25px", textAlign: "center", borderBottom: '2px solid rgba(194, 186, 186, 0.75)' }}>
         <Flex gap="middle" justify={"space-between"} align={"center"}>
            <div
              style={{
                fontSize: '2.5vh',
                width: '33.33%',
                fontWeight: 'bold',
                textAlign: 'start',
                color: 'rgba(22, 22, 22, 0.75)',
              }}
            >
            <RollbackOutlined
                 onClick={() => {
                    navigate('/');
                  }}
            ></RollbackOutlined>
            </div>
            <p
              style={{
                fontSize: '2vh',
                width: '33.33%',
                fontWeight: 'bold',
                color: 'rgba(22, 22, 22, 0.75)',
              }}
            >{`SW15-08`}</p>
            <ClockComponent></ClockComponent>
          </Flex>   
    </Header>)
}

export default PageHeader;