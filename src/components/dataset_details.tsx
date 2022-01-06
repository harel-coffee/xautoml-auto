import React from "react";
import {Candidate, Explanations, MetaInformation, Structure} from "../model";
import {Components, JupyterContext} from "../util";
import {TwoColumnLayout} from "../util/layout";
import {LimeComponent} from "./details/lime";
import {FeatureImportanceComponent} from "./details/feature_importance";
import {RawDataset} from "./details/raw_dataset";
import {DetailsModel} from "./details/model";
import {GlobalSurrogateComponent} from "./details/global_surrogate";
import {CollapseComp} from "../util/collapse";
import {PerformanceComponent} from "./details/performance";
import {HPImportanceComp} from "./details/hp_importance";
import {ConfigOriginComp} from "./details/config_origin";

interface DataSetDetailsProps {
    candidate: Candidate
    structure: Structure
    componentId: string
    componentLabel: string
    meta: MetaInformation

    structures: Structure[]
    explanations: Explanations
}

interface DataSetDetailsState {
    selectedSample: number

    showFeatureImportance: boolean
    showGlobalSurrogate: boolean
}

export class DataSetDetailsComponent extends React.Component<DataSetDetailsProps, DataSetDetailsState> {

    static contextType = JupyterContext;
    context: React.ContextType<typeof JupyterContext>;

    constructor(props: DataSetDetailsProps) {
        super(props);
        this.state = {selectedSample: undefined, showFeatureImportance: true, showGlobalSurrogate: true}

        this.handleSampleSelection = this.handleSampleSelection.bind(this)
        this.toggleFeatureImportance = this.toggleFeatureImportance.bind(this)
        this.toggleGlobalSurrogate = this.toggleGlobalSurrogate.bind(this)
    }

    private handleSampleSelection(idx: number) {
        this.setState({selectedSample: idx})
    }

    private toggleFeatureImportance() {
        this.setState((state) => ({showFeatureImportance: !state.showFeatureImportance}))
    }

    private toggleGlobalSurrogate() {
        this.setState((state) => ({showGlobalSurrogate: !state.showGlobalSurrogate}))
    }

    render() {
        const {candidate, structure, meta, componentId, componentLabel, structures, explanations} = this.props
        const {selectedSample} = this.state

        const model = new DetailsModel(candidate, componentId, componentLabel, selectedSample)

        return (
            <>
                <h3>Insights for Complete Pipeline</h3>
                <CollapseComp name={'performance'} showInitial={false} help={PerformanceComponent.HELP}>
                    <h3>Performance Details</h3>
                    <PerformanceComponent model={model} meta={meta}
                                          candidateMap={new Map(structure.configs.map(c => [c.id, c]))}/>
                </CollapseComp>

                <CollapseComp name={'config-origin'} showInitial={false} help={ConfigOriginComp.HELP}>
                    <h3>Configuration</h3>
                    <ConfigOriginComp candidate={candidate}
                                      structure={structure}
                                      structures={structures}
                                      explanations={explanations}/>
                </CollapseComp>

                <hr/>
                <h3>Insights for <i>
                    {Components.isPipEnd(model.component) ? 'Beginning of the Pipeline' : `${model.algorithm} (${model.component})`}
                </i>
                </h3>
                <p style={{marginBottom: '15px', marginTop: '-15px'}}>
                    Select any step in the pipeline above to calculate the analysis in the following views for the
                    output generated by the selected pipeline step.
                </p>

                <CollapseComp name={'raw-dataset'} showInitial={false} help={RawDataset.HELP}>
                    <h3>Data Set Preview</h3>
                    <TwoColumnLayout widthRight={'25%'}>
                        <RawDataset model={model} onSampleClick={this.handleSampleSelection}/>
                        <LimeComponent model={model}/>
                    </TwoColumnLayout>
                </CollapseComp>


                <CollapseComp name={'hp-importance'} showInitial={false} help={HPImportanceComp.HELP}>
                    <h3>Hyperparameter Importance</h3>
                    <HPImportanceComp structure={structure} component={componentId} metric={meta.metric}/>
                </CollapseComp>

                <CollapseComp name={'feature-importance'} showInitial={false} help={FeatureImportanceComponent.HELP}>
                    <h3>Feature Importance</h3>
                    <FeatureImportanceComponent model={model} height={200}/>
                </CollapseComp>

                <CollapseComp name={'global-surrogate'} showInitial={false} help={GlobalSurrogateComponent.HELP}>
                    <h3>Global Approximation</h3>
                    <GlobalSurrogateComponent model={model}/>
                </CollapseComp>

                <hr/>
            </>
        )
    }
}
