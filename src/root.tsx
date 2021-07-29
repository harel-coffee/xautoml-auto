import React from "react";
import {ReactWidget} from "@jupyterlab/apputils";
import {IRenderMime} from "@jupyterlab/rendermime-interfaces";
import {CandidateId, Pipeline, Runhistory} from "./model";
import MetaInformationTable from "./meta_information";
import CandidateTable from "./candidate_table";
import PerformanceTimeline from "./performance_timeline";
import {StructureGraphComponent} from "./structuregraph";
import {catchReactWarnings} from "./util";
import {RocCurve} from "./roc_curve";


/**
 * The class name added to the extension.
 */
const CLASS_NAME = 'mimerenderer-xautoml';

/**
 * A widget for rendering application/xautoml.
 */
export class JupyterWidget extends ReactWidget implements IRenderMime.IRenderer {
    private readonly _mimeType: string;
    private data: Runhistory = undefined;

    constructor(options: IRenderMime.IRendererOptions) {
        super();
        this._mimeType = options.mimeType;
        this.addClass(CLASS_NAME);

        catchReactWarnings()
    }

    renderModel(model: IRenderMime.IMimeModel): Promise<void> {
        try {
            this.data = Runhistory.fromJson(model.data[this._mimeType] as unknown as Runhistory);
        } catch (e) {
            console.error('Failed to parse runhistory', e)
        }

        // Trigger call of render().
        this.onUpdateRequest(undefined);
        return this.renderPromise;
    }

    protected render() {
        if (!this.data) {
            return <p>Error loading data...</p>
        }
        return <ReactRoot data={this.data}/>
    }
}

export interface ReactRootProps {
    data: Runhistory;
}

export interface ReactRootState {
    selectedCandidates: CandidateId[]
}

export default class ReactRoot extends React.Component<ReactRootProps, ReactRootState> {

    constructor(props: ReactRootProps) {
        super(props);
        this.state = {selectedCandidates: []}

        this.onCandidateSelection = this.onCandidateSelection.bind(this)
    }

    private onCandidateSelection(cids: CandidateId[]) {
        this.setState({selectedCandidates: cids})
    }

    render() {
        const data = this.props.data
        const selectedCandidates = this.state.selectedCandidates
        const pipelines = new Map<CandidateId, Pipeline>(this.props.data.structures.map(s => [s.cid, s.pipeline]))

        if (!data) {
            return <p>Error loading data...</p>
        }
        return <>
            <MetaInformationTable meta={data.meta}/>
            <CandidateTable structures={data.structures} metric_sign={data.meta.metric_sign}
                            selectedCandidates={selectedCandidates}
                            onCandidateSelection={this.onCandidateSelection}/>
            <div style={{'display': 'flex'}}>
                <div style={{'height': '400px', 'flexBasis': 0, 'flexGrow': 1}}>
                    <PerformanceTimeline data={data.structures} meta={data.meta} selectedCandidates={selectedCandidates}
                                         onCandidateSelection={this.onCandidateSelection}/>
                </div>
                <div style={{'height': '400px', 'flexBasis': 0, 'flexGrow': 1}}>
                    <RocCurve selectedCandidates={selectedCandidates} meta={data.meta}/>
                </div>
            </div>

            <StructureGraphComponent data={data.xai.structures} pipelines={pipelines}
                                     selectedCandidates={selectedCandidates} structures={data.structures}
                                     onCandidateSelection={this.onCandidateSelection}/>
        </>
    }

}
