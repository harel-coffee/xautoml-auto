import React from "react";
import {ReactWidget} from "@jupyterlab/apputils";
import {IRenderMime} from "@jupyterlab/rendermime-interfaces";
import {CandidateId, Runhistory} from "./model";
import {Colors, JupyterContext} from "./util";
import {CandidateTable} from "./components/candidate_table";
import {Jupyter} from "./jupyter";
import {LoadingIndicator} from "./util/loading";
import {Box, Checkbox, Tab, Tabs} from "@material-ui/core";
import {TabContext} from "@material-ui/lab";
import {TabPanel} from "./util/tabpanel";
import {SearchSpace} from "./components/search_space";
import {GeneralInformation} from "./components/general_information";


/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-xautoml';

/**
 * A widget for rendering application/xautoml.
 */
export class JupyterWidget extends ReactWidget implements IRenderMime.IRenderer {
    private readonly _mimeType: string;
    private readonly jupyter: Jupyter;
    private runhistory: Runhistory = undefined;

    constructor(options: IRenderMime.IRendererOptions, jupyter: Jupyter) {
        super();
        this._mimeType = options.mimeType;
        this.jupyter = jupyter

        this.addClass(CLASS_NAME);
    }

    renderModel(model: IRenderMime.IMimeModel): Promise<void> {
        try {
            this.runhistory = Runhistory.fromJson(model.data[this._mimeType] as unknown as Runhistory);
        } catch (e) {
            console.error('Failed to parse runhistory', e)
        }

        // Trigger call of render().
        this.onUpdateRequest(undefined);
        return this.renderPromise;
    }

    protected render() {
        if (!this.runhistory)
            return <p>Error loading data...</p>
        return <ReactRoot runhistory={this.runhistory} jupyter={this.jupyter}/>
    }
}

interface ReactRootProps {
    runhistory: Runhistory;
    jupyter: Jupyter;
}

interface ReactRootState {
    selectedCandidates: Set<CandidateId>
    showCandidate: CandidateId
    openTab: string
    mounted: boolean
    hideUnselected: boolean
}

export default class ReactRoot extends React.Component<ReactRootProps, ReactRootState> {

    private readonly container: React.RefObject<HTMLDivElement> = React.createRef<HTMLDivElement>();

    constructor(props: ReactRootProps) {
        super(props);
        this.state = {
            selectedCandidates: new Set<CandidateId>(),
            mounted: false,
            openTab: '1',
            showCandidate: undefined,
            hideUnselected: false
        }

        this.onCandidateSelection = this.onCandidateSelection.bind(this)
        this.switchTab = this.switchTab.bind(this)
        this.toggleShowAllCandidates = this.toggleShowAllCandidates.bind(this)
    }

    private onCandidateSelection(cids: Set<CandidateId>, show: boolean = false) {
        if (show && cids.size === 1) {
            const cid = cids.values().next().value
            this.setState({showCandidate: cid, openTab: '1'})
        } else {
            this.setState({selectedCandidates: cids})
        }
    }

    componentDidMount() {
        if (this.container.current.clientWidth > 0)
            this.setState({mounted: true})
        else
            // Jupyter renders all components before output containers are rendered.
            // Delay rendering to get the container width.
            window.setTimeout(() => this.setState({mounted: true}), 100)
    }

    private switchTab(_: any, selectedTab: string) {
        this.setState({openTab: selectedTab})
    }

    private toggleShowAllCandidates(_: React.ChangeEvent, checked: boolean) {
        this.setState({hideUnselected: !checked})
    }

    render() {
        const {runhistory, jupyter} = this.props
        const {selectedCandidates, showCandidate, mounted, openTab, hideUnselected} = this.state

        class DivInTabs extends React.Component<any> {
            render() {
                let {children, style} = this.props;
                return <div style={style} className={'MuiButtonBase-root MuiTab-root MuiTab-textColorInherit'}
                            onClick={e => e.stopPropagation()} children={children}/>;
            }
        }

        if (!mounted) {
            // Render loading indicator while waiting for delayed re-rendering with mounted container
            return (
                <div ref={this.container} style={{width: '100%'}}>
                    <LoadingIndicator loading={true}/>
                </div>
            )
        }

        if (!runhistory) {
            return <p>Error loading data...</p>
        }
        return (
            <JupyterContext.Provider value={jupyter}>
                <div style={{display: 'flex'}}>
                    <div style={{flexGrow: 0, flexShrink: 0, flexBasis: '300px', marginRight: '20px'}}>
                        <GeneralInformation structures={runhistory.structures}
                                            meta={runhistory.meta}
                                            candidateMap={runhistory.candidateMap}
                                            selectedCandidates={selectedCandidates}
                                            onCandidateSelection={this.onCandidateSelection}/>
                    </div>
                    <div style={{flexGrow: 2}}>


                        <button
                            key="header-thread"
                            className="jp-example-button"
                            onClick={(): void => {
                                jupyter.executeCode('print("8")\nraise ValueError()')
                                    .then((res: any) => {
                                        console.log(res)
                                    })
                                    .catch((error: Error) => {
                                        console.error(error)
                                    })
                            }}
                        >
                            Compute 3+5
                        </button>


                        <TabContext value={openTab}>
                            <Box sx={{borderBottom: 1, borderColor: 'divider'}}>
                                <Tabs value={openTab} onChange={this.switchTab} TabIndicatorProps={{
                                    style: {backgroundColor: Colors.HIGHLIGHT}
                                }}>
                                    <Tab label="Candidates" value={'1'}/>
                                    <Tab label="Search Space" value={'2'}/>
                                    <Tab label="Ensembles" value={'3'}/>

                                    <DivInTabs style={{marginLeft: 'auto', cursor: 'default'}}>
                                        <span className={'MuiTab-wrapper'}>
                                            Selected Candidates: {selectedCandidates.size} / {runhistory.meta.n_configs}
                                        </span>
                                    </DivInTabs>
                                    <DivInTabs>
                                        <label className={'MuiFormControlLabel-root'}>
                                            <Checkbox checked={!hideUnselected}
                                                      onChange={this.toggleShowAllCandidates}/>
                                            <span>Show&nbsp;All&nbsp;Candidates</span>
                                        </label>
                                    </DivInTabs>
                                </Tabs>
                            </Box>

                            <TabPanel value={'1'}>
                                <CandidateTable structures={runhistory.structures}
                                                selectedCandidates={selectedCandidates}
                                                hideUnselectedCandidates={hideUnselected}
                                                meta={runhistory.meta}
                                                explanations={runhistory.explanations}
                                                showCandidate={showCandidate}
                                                onCandidateSelection={this.onCandidateSelection}/>
                            </TabPanel>
                            <TabPanel value={'2'}>
                                <SearchSpace structures={runhistory.structures}
                                             meta={runhistory.meta}
                                             explanations={runhistory.explanations}
                                             selectedCandidates={selectedCandidates}
                                             hideUnselectedCandidates={hideUnselected}
                                             onCandidateSelection={this.onCandidateSelection}/>
                            </TabPanel>
                            <TabPanel value={'3'}>
                                <p>TODO: missing</p>
                            </TabPanel>
                        </TabContext>
                    </div>
                </div>
            </JupyterContext.Provider>
        )
    }

}
