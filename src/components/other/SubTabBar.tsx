import { Focusable, GamepadButton, GamepadEvent, gamepadTabbedPageClasses, scrollPanelClasses } from '@decky/ui'
import { useCallback, useRef, VFC } from 'react'
import { CustomTabContainer } from '../../state/CustomTabContainer'

export interface SubTabBarProps {
    subTabs: CustomTabContainer[]
    selectedSubTabId: string | null
    onSelectSubTab: (subTabId: string | null) => void
    collectionAppFilter?: any
    onEditSubTab?: (subTab: CustomTabContainer) => void
}

export const SubTabBar: VFC<SubTabBarProps> = ({
    subTabs,
    selectedSubTabId,
    onSelectSubTab,
    collectionAppFilter,
    onEditSubTab,
}) => {
    const tabRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
    const allRef = useRef<HTMLDivElement | null>(null)

    const getSelectedIndex = useCallback(() => {
        if (selectedSubTabId === null) return 0
        const idx = subTabs.findIndex(st => st.id === selectedSubTabId)
        return idx >= 0 ? idx + 1 : 0
    }, [selectedSubTabId, subTabs])

    const focusTarget = useCallback((targetId: string | null) => {
        setTimeout(() => {
            if (targetId === null) {
                allRef.current?.focus?.()
            } else {
                tabRefs.current.get(targetId)?.focus?.()
            }
        }, 0)
    }, [])

    const handleNavigate = useCallback(
        (direction: -1 | 1) => {
            const currentIndex = getSelectedIndex()
            const totalOptions = subTabs.length + 1
            let newIndex = currentIndex + direction
            if (newIndex < 0) newIndex = 0
            if (newIndex >= totalOptions) newIndex = totalOptions - 1

            const newId = newIndex === 0 ? null : subTabs[newIndex - 1].id
            onSelectSubTab(newId)
            focusTarget(newId)
        },
        [getSelectedIndex, subTabs, onSelectSubTab, focusTarget]
    )

    const handleButtonDown = useCallback(
        (evt: GamepadEvent) => {
            if (evt.detail.button === GamepadButton.TRIGGER_LEFT) {
                evt.stopPropagation()
                handleNavigate(-1)
            } else if (evt.detail.button === GamepadButton.TRIGGER_RIGHT) {
                evt.stopPropagation()
                handleNavigate(1)
            }
        },
        [handleNavigate]
    )

    if (!subTabs || subTabs.length === 0) return null

    const totalOptions = subTabs.length + 1
    const selectedIndex = getSelectedIndex()
    const canGoLeft = selectedIndex > 0
    const canGoRight = selectedIndex < totalOptions - 1

    return (
        <div className={gamepadTabbedPageClasses.TabRow}>
            <div className={`${gamepadTabbedPageClasses.Glyphs} ${gamepadTabbedPageClasses.Show}`}>
                <img style={{ width: '24px' }} aria-label='L2 Button' src='/steaminputglyphs/sd_l2.svg' />
            </div>
            <div role='tablist' aria-orientation='horizontal' className={gamepadTabbedPageClasses.TabRowTabs}>
                <div className={gamepadTabbedPageClasses.TabsRowScroll}>
                    <Focusable
                        flow-children='right'
                        onButtonDown={handleButtonDown}
                        actionDescriptionMap={{
                            ...(canGoLeft ? { [GamepadButton.TRIGGER_LEFT]: 'Previous' } : {}),
                            ...(canGoRight ? { [GamepadButton.TRIGGER_RIGHT]: 'Next' } : {}),
                        }}
                        className={`${scrollPanelClasses.ScrollX} ${scrollPanelClasses.ScrollPanel} ${gamepadTabbedPageClasses.FixCenterAlignScroll}`}
                        style={{ padding: '6px 0px' }}
                    >
                        {(() => {
                            const isAllSelected = selectedSubTabId === null
                            return (
                                <Focusable
                                    key='all'
                                    ref={allRef}
                                    className={`${gamepadTabbedPageClasses.Tab}${isAllSelected ? ` ${gamepadTabbedPageClasses.Selected}` : ''}`}
                                    onActivate={() => {
                                        onSelectSubTab(null)
                                        focusTarget(null)
                                    }}
                                    noFocusRing
                                >
                                    <span className={gamepadTabbedPageClasses.TabTitle}>All</span>
                                </Focusable>
                            )
                        })()}
                        {subTabs.map(subTab => {
                            const isSelected = selectedSubTabId === subTab.id
                            const appCount = collectionAppFilter
                                ? subTab.collection.GetAppCountWithToolsFilter?.(collectionAppFilter)
                                : (subTab.collection.visibleApps?.length ?? 0)
                            return (
                                <Focusable
                                    key={subTab.id}
                                    ref={el => {
                                        if (el) tabRefs.current.set(subTab.id, el)
                                    }}
                                    className={`${gamepadTabbedPageClasses.Tab} ${gamepadTabbedPageClasses.HasAddon} ${gamepadTabbedPageClasses.RightAddon} ${isSelected ? ` ${gamepadTabbedPageClasses.Selected}` : ''}`}
                                    onActivate={() => {
                                        onSelectSubTab(subTab.id)
                                        focusTarget(subTab.id)
                                    }}
                                    onMenuButton={() => onEditSubTab?.(subTab)}
                                    onMenuActionDescription='Tab Master'
                                    noFocusRing
                                >
                                    <span className={gamepadTabbedPageClasses.TabTitle}>{subTab.title}</span>
                                    <span className={gamepadTabbedPageClasses.TabCount}>{appCount}</span>
                                </Focusable>
                            )
                        })}
                    </Focusable>
                </div>
            </div>
            <div className={`${gamepadTabbedPageClasses.Glyphs} ${gamepadTabbedPageClasses.Show}`}>
                <img style={{ width: '24px' }} aria-label='R2 Button' src='/steaminputglyphs/sd_r2.svg' />
            </div>
        </div>
    )
}
