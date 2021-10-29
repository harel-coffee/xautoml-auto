import React from "react";
import {ConfigValue, MetaInformation} from "../model";
import {CollapseComp} from "../util/collapse";
import {KeyValue} from "../util/KeyValue";

interface MetaInformationProps {
    meta: MetaInformation
}

export default class MetaInformationTable extends React.Component<MetaInformationProps, {}> {

    render() {
        const meta = this.props.meta
        const start = new Date(0)
        start.setUTCSeconds(meta.start_time)
        const end = new Date(0)
        end.setUTCSeconds(meta.end_time)

        const configValues: [string, ConfigValue][] = []
        meta.configuration.forEach((value, key) => configValues.push([key, value]))

        return (
            <>
                <CollapseComp showInitial={true}>
                    <h4>Optimization Overview</h4>
                    <>
                        <KeyValue key_={'Data Set'} value={`Task ${meta.openml_task} on Fold ${meta.openml_fold}`}
                                  href={`https://www.openml.org/t/${meta.openml_task}`}/>
                        <KeyValue key_={'Start Time'} value={start}/>
                        <KeyValue key_={'End Time'} value={end}/>
                        <KeyValue key_={'Metric'} value={meta.metric}/>
                        {/* TODO */}
                        <KeyValue key_={'Best Performance'} value={0}/>
                        <KeyValue key_={'Total Nr. Configs.'} value={meta.n_configs}/>
                        <KeyValue key_={'Unique Structures'} value={meta.n_structures}/>
                    </>
                </CollapseComp>

                <CollapseComp showInitial={false}>
                    <h4>Optimization Configuration</h4>
                    <>
                        {configValues.map(([key, value]) =>
                            <div className={'overview-row'} key={key}>
                                {key}: {value.toString()}
                            </div>
                        )}
                    </>
                </CollapseComp>
            </>
        )
    }
}
