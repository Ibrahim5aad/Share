import React, {useState} from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import useTheme from '@mui/styles/useTheme'
import Dialog from './Dialog'
import {TooltipIconButton} from './Buttons'
import AttachIcon from '@mui/icons-material/AddLink'
import UploadIcon from '../assets/icons/Upload.svg'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import useStore from '../store/useStore'
import {reifyName} from '@bldrs-ai/ifclib'
import LinkOffIcon from '@mui/icons-material/LinkOff'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import Tooltip from '@mui/material/Tooltip'
import FolderIcon from '@mui/icons-material/Folder'

/**
 * Displays attach open dialog.
 *
 * @return {React.ReactElement}
 */
export default function AttachModelControl({fileAttach}) {
  const [isDialogDisplayed, setIsDialogDisplayed] = useState(false)
  const theme = useTheme()

  return (
    <Box
      sx={{
        '& button': {
          margin: '0',
          border: `solid 1px ${theme.palette.primary.background}`,
        },
      }}
    >
      <Paper elevation={0} variant='control'>
        <TooltipIconButton
          title={'Attach IFC'}
          onClick={() => setIsDialogDisplayed(true)}
          icon={<AttachIcon style={{width: '25px'}}/>}
          placement={'right'}
          selected={isDialogDisplayed}
          dataTestId={'attach-ifc'}
        />
      </Paper>
      {isDialogDisplayed &&
        <AttachModelDialog
          isDialogDisplayed={isDialogDisplayed}
          setIsDialogDisplayed={setIsDialogDisplayed}
          fileAttach={fileAttach}
        />
      }
    </Box>
  )
}

/**
 * @param {boolean} isDialogDisplayed
 * @param {Function} setIsDialogDisplayed
 * @return {object} React component
 */
function AttachModelDialog({isDialogDisplayed, setIsDialogDisplayed, fileAttach}) {
  const attachFile = () => {
    fileAttach(true)
    setIsDialogDisplayed(false)
  }
  const attachedModels = useStore((state) => state.attachedModels)
  const removeAttachedModel = useStore((state) => state.removeAttachedModel)
  const viewer = useStore((state) => state.viewerStore)
  const theme = useTheme()
  const detachModel = (model) => {
    removeAttachedModel(model.modelID)
    viewer.unloadAttachedIfc(model)
  }
  return (
    <Dialog
      icon={<AttachIcon style={{width: '25px'}}/>}
      headerText={'Manage Attached Models'}
      isDialogDisplayed={isDialogDisplayed}
      setIsDialogDisplayed={setIsDialogDisplayed}
      actionTitle={`Attach local file`}
      actionIcon={<UploadIcon/>}
      actionCb={attachFile}
      content={
        <Box
          sx={{
            width: '430px',
            paddingTop: '6px',
            textAlign: 'left',
          }}
        >
          <Box
            variant={'h4'}
            sx={{
              backgroundColor: theme.palette.scene.background,
              borderRadius: '5px',
              padding: '12px',
            }}
          >
            <List>
              {attachedModels.map((val) => {
                return (
                  <ListItem
                    key={val.model.modelID}
                    secondaryAction={
                      <Tooltip title='Detach Model'>
                        <IconButton onClick={() => detachModel(val.model)} edge='end' aria-label='detach'>
                          <LinkOffIcon style={{width: '25px', height: '25px'}}/>
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar style={{width: '29px', height: '29px'}}>
                        <AttachFileIcon style={{width: '25px', height: '25px'}}/>
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={reifyName({properties: val.model}, val.root)}
                    />
                  </ListItem>)
              })}
            </List>
            {(attachedModels.length === 0) &&
                <Box>
                  <FolderIcon sx={{
                    margin: 'auto',
                    width: '100%',
                    height: '100px',
                    opacity: '0.2',
                  }}
                  />
                  <Box
                    sx={{
                      textAlign: 'center',
                      opacity: '0.4',
                      margin: 'auto',
                    }}
                  >
                    No Attachements
                  </Box>
                </Box>
            }
          </Box>

          <Box
            sx={{
              marginTop: '1em',
              fontSize: '.8em',
            }}
          >
            * Local files cannot yet be saved or shared.
          </Box>
        </Box>
      }
    />
  )
}
