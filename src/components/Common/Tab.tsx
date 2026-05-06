import { Tabs } from 'antd'
import type { TabsProps } from 'antd'
import { useSwipeable } from 'react-swipeable'
import { useState } from 'react'
import styled from 'styled-components'
import { bodySizes } from "@/styles/mixins";

interface CommonTabsProps {
    items: TabsProps['items']
    defaultActiveKey?: string
    onChange?: (key: string) => void
}

const StyledTabs = styled(Tabs)`
  .ant-tabs-nav {
    border-bottom: 1px solid #534d4d !important;
    padding-left: 25px; 
  }

  .ant-tabs-tab-btn {
    ${bodySizes.medium};
    color: #958f8f;
    transition: color 0.25s ease;
  }

  .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #1487d8 !important;
    font-weight: 800;
  }
`

const CommonTabs = ({ items = [], defaultActiveKey, onChange }: CommonTabsProps) => {
    const [activeKey, setActiveKey] = useState(defaultActiveKey ?? items[0]?.key ?? '1')

    const keys = items.map(item => item!.key as string)
    const currentIndex = keys.indexOf(activeKey)

    const handleChange = (key: string) => {
        setActiveKey(key)
        onChange?.(key)
    }

    const handlers = useSwipeable({
        onSwipedLeft: () => {
            const next = keys[currentIndex + 1]
            if (next) handleChange(next)
        },
        onSwipedRight: () => {
            const prev = keys[currentIndex - 1]
            if (prev) handleChange(prev)
        },
        preventScrollOnSwipe: true,
    })

    return (
        <div {...handlers} style={{ height: '100%' }}>
            <StyledTabs
                items={items}
                activeKey={activeKey}
                onChange={handleChange}
                style={{ height: '100%' }}
            />
        </div>
    )
}

export default CommonTabs