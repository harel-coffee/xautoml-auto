import React from "react";
import {DetailsModel} from "./model";
import {KeyValue} from "../../util/KeyValue";
import {JupyterContext, prettyPrint} from "../../util";
import {ConfusionMatrix} from "./confusion_matrix";
import {RocCurve} from "../general/roc_curve";
import {Candidate, CandidateId, MetaInformation} from "../../model";
import {PerformanceData} from "../../dao";
import {ErrorIndicator} from "../../util/error";
import {LoadingIndicator} from "../../util/loading";
import {Table, TableBody, TableCell, TableRow} from "@material-ui/core";
import {Heading} from "../../util/heading";


interface PerformanceComponentProps {
    model: DetailsModel
    meta: MetaInformation
    candidateMap: Map<CandidateId, Candidate>
}

interface PerformanceComponentState {
    data: PerformanceData
    loading: boolean
    error: Error
}

export class PerformanceComponent extends React.Component<PerformanceComponentProps, PerformanceComponentState> {

    static readonly HELP = 'Displays basic performance details like train and test performance. Additionally, a ' +
        'confusion matrix for all classes is computed. Finally, the ROC curve for this candidate is displayed.'

    static contextType = JupyterContext;
    context: React.ContextType<typeof JupyterContext>;

    constructor(props: PerformanceComponentProps) {
        super(props);
        this.state = {data: undefined, loading: false, error: undefined}
    }

    componentDidMount() {
        this.queryPerformanceData()
    }

    private queryPerformanceData() {
        if (this.state.loading)
            return

        const {model} = this.props
        this.setState({loading: true})
        this.context.requestPerformanceData(model.candidate.id)
            .then(data => this.setState({data: data, loading: false}))
            .catch(error => {
                console.error(`Failed to fetch confusion matrix: \n${error.name}: ${error.message}`);
                this.setState({error: error, loading: false})
            });
    }

    render() {
        const {model, meta, candidateMap} = this.props
        const {data, loading, error} = this.state

        return (
            <>
                <ErrorIndicator error={error}/>
                {!error && <>
                    <LoadingIndicator loading={loading}/>
                    {data &&
                        <div className={'performance-wrapper'}>
                            <div style={{flexGrow: 0, flexShrink: 1,}}>
                                <Heading help={'Displays the training and validation performance in addition with the' +
                                    'validation accuracy. Furthermore, the training duration and time for creating' +
                                    'predictions using this model are displayed.'}>
                                    <h4>Metrics</h4>
                                </Heading>

                                <KeyValue key_={`Training ${meta.metric}`} value={model.candidate.loss} prec={4}/>
                                <KeyValue key_={`Validation ${meta.metric}`} value={data.val_score} prec={4}/>
                                <KeyValue key_={`Validation Accuracy`} value={data.accuracy} prec={4}/>
                                <KeyValue key_={'Training Duration'}
                                          value={`${prettyPrint(model.candidate.runtime.training_time)} sec`}/>
                                <KeyValue key_={'Prediction Duration'}
                                          value={`${prettyPrint(data.duration)} sec`}/>

                                <hr/>

                                <h4>Information</h4>
                                <KeyValue key_={'Status'} value={model.candidate.status}/>
                                <KeyValue key_={'Budget'} value={model.candidate.budget}/>
                            </div>

                            <div style={{flexGrow: 0, margin: "0 10px"}}>
                                <Heading help={'For each possible class, relevance metrics are displayed. Precision ' +
                                    '(also called positive predictive value) is the fraction of relevant instances ' +
                                    'among the retrieved instances, while recall (also known as sensitivity) is the ' +
                                    'fraction of relevant instances that were retrieved. Support is the number of ' +
                                    'total items in the respective class.'}>
                                    <h4>Class Report</h4>
                                </Heading>
                                <Table className={'jp-RenderedHTMLCommon'}>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell component="th"/>
                                            <TableCell component="th" scope="row">Precision</TableCell>
                                            <TableCell component="th" scope="row">Recall</TableCell>
                                            <TableCell component="th" scope="row">Support</TableCell>
                                        </TableRow>

                                        {Array.from(data.report.keys()).map(clazz =>
                                            <TableRow key={clazz}>
                                                <TableCell component="th" scope="col">{clazz}</TableCell>
                                                <TableCell>{prettyPrint(data.report.get(clazz).precision)}</TableCell>
                                                <TableCell>{prettyPrint(data.report.get(clazz).recall)}</TableCell>
                                                <TableCell>{prettyPrint(data.report.get(clazz).support)}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div style={{flexGrow: 0, margin: "0 10px"}}>
                                <Heading help={'A confusion matrix is a table layout that allows visualization of ' +
                                    'the performance of a classifier. Each row of the matrix represents the ' +
                                    'instances in an actual class while each column represents the instances in a ' +
                                    'predicted class.'}>
                                    <h4>Confusion Matrix</h4>
                                </Heading>
                                <ConfusionMatrix cm={data.cm}/>
                            </div>

                            <div style={{flexGrow: 0, flexBasis: "25%"}}>
                                <Heading help={RocCurve.HELP}>
                                    <h4>Receiver Operating Characteristic (ROC) Curve</h4>
                                </Heading>
                                <RocCurve selectedCandidates={new Set([model.candidate.id])}
                                          candidateMap={candidateMap}
                                          height={200}/>
                            </div>
                        </div>
                    }
                </>
                }
            </>
        )
    }
}
