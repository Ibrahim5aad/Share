import React from 'react'
import {act, render, renderHook, fireEvent} from '@testing-library/react'
import useStore from '../store/useStore'
import ShareMock from '../ShareMock'
import {newMockStringValueElt} from '../utils/IfcMock.test'
import NavTree from './NavTree'
import {IfcViewerAPIExtended} from '../Infrastructure/IfcViewerAPIExtended'
import {actAsyncFlush} from '../utils/tests'


jest.mock('@mui/lab/TreeItem', () => {
  const original = jest.requireActual('@mui/lab/TreeItem')
  return {
    __esModule: true,
    ...original,
    useTreeItem: jest.fn().mockReturnValue({
      disabled: false,
      expanded: false,
      selected: false,
      focused: false,
      handleExpansion: jest.fn(),
      handleSelection: jest.fn(),
    }),
  }
})

describe('NavTree', () => {
  it('NavTree for single element', async () => {
    const modelMock = {modelID: 0}
    const testLabel = 'Test node label'
    const {result} = renderHook(() => useStore((state) => state))
    const viewer = new IfcViewerAPIExtended()
    await act(() => {
      result.current.setViewerStore(viewer)
    })
    const {getByText} = render(
        <ShareMock>
          <NavTree
            model={modelMock}
            element={newMockStringValueElt(testLabel)}
          />
        </ShareMock>)
    await actAsyncFlush()
    expect(getByText(testLabel)).toBeInTheDocument()
  })

  it('Can hide element by the hide icon', async () => {
    const selectElementsMock = jest.fn()
    const testLabel = 'Test node label'
    const ifcElementMock = newMockStringValueElt(testLabel)
    const modelMock = {modelID: 0}
    const {result} = renderHook(() => useStore((state) => state))
    const viewer = new IfcViewerAPIExtended()
    await act(() => {
      result.current.setViewerStore(viewer)
      result.current.unhideElements([1])
    })
    const isolatorMock = {
      canBeHidden: jest.fn(() => true),
      flattenChildren: jest.fn(() => [ifcElementMock.expressID]),
      hideElementsById: jest.fn(),
    }
    viewer.getIsolator.mockReturnValue(isolatorMock)
    const {getByText, getByTestId} = render(
        <NavTree
          element={ifcElementMock}
          model={modelMock}
          pathPrefix={'/share/v/p/index.ifc'}
          selectWithShiftClickEvents={selectElementsMock}
        />)
    const root = getByText(testLabel)
    const hideIcon = getByTestId('hide-icon')
    expect(root).toBeInTheDocument()
    expect(hideIcon).toBeInTheDocument()
    fireEvent.click(hideIcon)

    // hide icon click should call the isolator's hideElementsById
    expect(isolatorMock.canBeHidden.mock.calls).toHaveLength(1)
    expect(isolatorMock.hideElementsById).toHaveBeenLastCalledWith([ifcElementMock.expressID])
  })

  it('should select element on click', async () => {
    const selectElementsMock = jest.fn()
    const selectedElementMock = {modelID: 0, expressID: 1, fullyQualifiedId: '0-1'}
    const testLabel = 'Test node label'
    const ifcElementMock = newMockStringValueElt(testLabel)
    const modelMock = {modelID: 0}
    const {getByText} = render(
        <NavTree
          element={ifcElementMock}
          model={modelMock}
          pathPrefix={'/share/v/p/index.ifc'}
          selectWithShiftClickEvents={selectElementsMock}
        />)
    const root = await getByText(testLabel)
    expect(getByText(testLabel)).toBeInTheDocument()
    await act(() => {
      fireEvent.click(root)
    })
    expect(selectElementsMock).toHaveBeenLastCalledWith(false, selectedElementMock)
    await act(() => {
      fireEvent.click(root, {shiftKey: true})
    })
    expect(selectElementsMock).toHaveBeenLastCalledWith(true, selectedElementMock)
  })
})
