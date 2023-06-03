import React from 'react'
import useStore from '../store/useStore'
import IfcIsolator from '../Infrastructure/IfcIsolator'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import GlassesIcon from '../assets/icons/Glasses.svg'

/**
 * @param {IfcIsolator} The IFC isoaltor
 * @param {number} IFC element id
 * @return {object} React component
 */
export default function HideToggleButton({element}) {
  const elementId = element.expressID
  const modelId = element.modelID
  const fullId = element.getFullyQualifiedId()
  const isHidden = useStore((state) => state.hiddenElements[fullId])
  const updateHiddenStatus = useStore((state) => state.updateHiddenStatus)
  const isIsolated = useStore((state) => state.isolatedElements[elementId])
  const isTempIsolationModeOn = useStore((state) => state.isTempIsolationModeOn)
  const viewer = useStore((state) => state.viewerStore)

  const toggleHide = () => {
    const toBeHidden = viewer.getIsolator(modelId).flattenChildren(elementId)
    if (!isHidden) {
      viewer.getIsolator(modelId).hideElementsById(toBeHidden)
      if (!Number.isInteger(elementId)) {
        updateHiddenStatus(fullId, true)
      }
    } else {
      viewer.getIsolator(modelId).unHideElementsById(toBeHidden)
      if (!Number.isInteger(elementId)) {
        updateHiddenStatus(fullId, false)
      }
    }
  }

  const iconStyle = {
    float: 'right',
    marginTop: '2px',
    height: '20px',
    opacity: 0.3,
    visibility: 'hidden',
  }
  if (isTempIsolationModeOn) {
    iconStyle.pointerEvents = 'none'
    if (isIsolated) {
      iconStyle.opacity = 1
      iconStyle.width = '27px'
    }
  }

  if (isIsolated) {
    return <GlassesIcon style={iconStyle}/>
  } else if (!isHidden) {
    return <VisibilityIcon data-testid='hide-icon' style={iconStyle} onClick={toggleHide}/>
  } else {
    return <VisibilityOffIcon data-testid='unhide-icon' style={iconStyle} onClick={toggleHide}/>
  }
}
