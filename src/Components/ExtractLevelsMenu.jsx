
import React, {useState, useEffect} from 'react'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import {makeStyles} from '@mui/styles'
import {TooltipIconButton} from './Buttons'
import useStore from '../store/useStore'
import {getModelCenter} from '../utils/cutPlane'
import {addHashParams, getHashParams} from '../utils/location'
import {Vector3} from 'three'
import {useLocation} from 'react-router-dom'
import {removePlanes} from '../utils/cutPlane'
import {extractHeight} from '../utils/extractHeight'
import LevelsIcon from '../assets/2D_Icons/Levels.svg'
import PlanViewIcon from '../assets/2D_Icons/PlanView.svg'


/**
 * BasicMenu used when there are several option behind UI button
 * show/hide from the right of the screen.
 *
 * @param {Array} listOfOptions Title for the drawer
 * @return {object} ItemPropertiesDrawer react component
 */
export default function ExtractLevelsMenu({listOfOptions, icon, title}) {
  const [anchorEl, setAnchorEl] = useState(null)
  const classes = useStyles()
  const open = Boolean(anchorEl)

  const model = useStore((state) => state.modelStore)
  let [floorplanMenuItems, showExtractMenu] = useState([])

  const PLANE_PREFIX = 'p'
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }
  const viewer = useStore((state) => state.viewerStore)
  const location = useLocation()
  const createFloorplanPlane = (h1, h2) => {
    removePlanes(viewer)
    const modelCenter1 = new Vector3(0, h1, 0)
    const modelCenter2 = new Vector3(0, h2, 0)
    const normal1 = new Vector3(0, 1, 0)
    const normal2 = new Vector3(0, -1, 0)
    viewer.clipper.createFromNormalAndCoplanarPoint(normal1, modelCenter1)
    viewer.clipper.createFromNormalAndCoplanarPoint(normal2, modelCenter2)
  }
  const planView = () => {
    viewer.context.ifcCamera.toggleProjection()
    viewer.plans.moveCameraTo2DPlanPosition(true)
    const yConst = 100 // value used in moveCameraTo2DPlanPosition in web-ifc
    const modelCenterX = getModelCenter(model).x
    const modelCenterY = getModelCenter(model).y
    const modelCenterZ = getModelCenter(model).z
    const camera = viewer.context.ifcCamera
    camera.cameraControls.setLookAt(modelCenterX, yConst, modelCenterZ, modelCenterX, 0, modelCenterZ, true)
    const currentProjection = camera.projectionManager.currentProjection
    const camFac = 5
    if (currentProjection === 0) {
      camera.cameraControls.setLookAt(
          modelCenterX * camFac, modelCenterY * camFac, -modelCenterZ * camFac, modelCenterX, modelCenterY, modelCenterZ, true)
    }
  }
  const createPlane = (normalDirection) => {
    const modelCenter = getModelCenter(model)
    const planeHash = getHashParams(location, 'p')
    let normal
    switch (normalDirection) {
      case 'x':
        normal = new Vector3(1, 0, 0)
        break
      case 'y':
        normal = new Vector3(0, 1, 0)
        break
      case 'z':
        normal = new Vector3(0, 0, 1)
        break
      default:
        normal = new Vector3(0, 1, 0)
        break
    }
    if (!planeHash || planeHash !== normalDirection ) {
      addHashParams(window.location, PLANE_PREFIX, {planeAxis: normalDirection})
    }
    return viewer.clipper.createFromNormalAndCoplanarPoint(normal, modelCenter)
  }
  useEffect(() => {
    const planeHash = getHashParams(location, 'p')
    if (planeHash && model && viewer) {
      const planeDirection = planeHash.split(':')[1]
      createPlane(planeDirection)
    }
  }, [model])

  showExtractMenu = async () => {
    const allStor = await extractHeight(model)
    try {
      if (floorplanMenuItems.length + 1 <= allStor.length) {
        const floorOffset = 0.2
        const ceilOffset = 0.4
        for (let i = 0; i < allStor.length; i++) {
          floorplanMenuItems[i] = (
            <MenuItem onClick={() =>
              createFloorplanPlane(allStor[i] + floorOffset, allStor[i + 1] - ceilOffset)}
            >  L{i} </MenuItem>)
        }
      }
    } catch {
      console.error('No levels found')
    }
  }

  showExtractMenu()

  return (
    <div>
      <TooltipIconButton
        title={'Extract Levels'}
        icon={<LevelsIcon/>}
        onClick={handleClick}
      />
      <Menu
        elevation={1}
        id='basic-menu'
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{vertical: 'top', horizontal: 'center'}}
        transformOrigin={{vertical: 'top', horizontal: 'center'}}
        className={classes.root}
        PaperProps={{
          style: {
            left: '300px',
            transform: 'translateX(-40px) translateY(-40px)',
          },
        }}
      >
        <TooltipIconButton
          title={'Toggle Plan View'}
          icon={<PlanViewIcon/>}
          onClick={planView}
        />
        {floorplanMenuItems}
      </Menu>
    </div>
  )
}

const useStyles = makeStyles({
  root: {
    '& .MuiMenu-root': {
      position: 'absolute',
      left: '-200px',
      top: '200px',
    },
  },
},
)
