/**
	Copyright 2015 Patrick George Wyndham Smith
*/

export function findParticularSubsectionOptionsInList(subsectionIDToFind, subsectionOptionsList) {
	return subsectionOptionsList.find(subsectionOptions =>
		subsectionOptions.get('id') === subsectionIDToFind
	);
};

export function findParticularBlockTypeOptionsWithGroupAndTypeInMap(chosenBlockTypeGroup, chosenBlockType, blockGroupIDsToTypesMap) {
	// Find options by searching for the particular ID
	var chosenTypesList = blockGroupIDsToTypesMap.get(chosenBlockTypeGroup);
	if (!chosenTypesList) {
		return null;
	}

	return chosenTypesList.find(blockTypeOptions =>
		blockTypeOptions.get('id') === chosenBlockType
	);
};

export function findParticularTraitOptionsInList(traitIDToFind, traitOptionsList) {
	return traitOptionsList.find(traitOptions =>
		traitOptions.get('id') === traitIDToFind
  );
};
