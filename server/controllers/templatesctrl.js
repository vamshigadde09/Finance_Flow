const Group = require("../models/Group");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Template = require("../models/Template");

const createTemplate = async (req, res) => {
    try {
        const { name, description, category, notes, splitType, group, isDefault, amount, splitBetween } = req.body;
        const createdBy = req.user._id;


        if (!name || !group) {
            return res.status(400).json({
                success: false,
                message: "Name, group are required"
            });
        }

        // Validate group exists
        const groupExists = await mongoose.model("Group").exists({ _id: group });
        if (!groupExists) {
            return res.status(404).json({
                success: false,
                message: "Group not found"
            });
        }

        // Validate splitBetween array
        if (!Array.isArray(splitBetween)) {
            return res.status(400).json({
                success: false,
                message: "splitBetween must be an array"
            });
        }

        // Create template with explicit splitBetween field
        const templateData = {
            name,
            description,
            amount,
            category,
            notes,
            splitType,
            group,
            createdBy,
            isDefault,
            splitBetween: splitBetween.map(id => new mongoose.Types.ObjectId(id)) // Convert strings to ObjectIds
        };

        const newTemplate = new Template(templateData);
        const savedTemplate = await newTemplate.save();

        // Populate the saved template before sending response
        const populatedTemplate = await Template.findById(savedTemplate._id)
            .populate("createdBy", "firstName lastName email")
            .populate("group", "name description")
            .populate("splitBetween", "firstName lastName email");

        res.status(201).json({
            success: true,
            template: populatedTemplate
        });
    } catch (error) {
        console.error("Template creation error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while creating template",
            error: error.message
        });
    }
};

const getGroupTemplates = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;


        // Validate group exists and user has access to it
        const group = await Group.findOne({
            _id: groupId,
            members: userId
        }).populate('members', 'firstName lastName email');

        if (!group) {
            console.error("Group not found or user doesn't have access:", {
                groupId,
                userId
            });
            return res.status(404).json({
                success: false,
                message: "Group not found or you don't have access"
            });
        }


        // Fetch templates with populated fields
        const templates = await Template.find({ group: groupId })
            .populate("createdBy", "firstName lastName email")
            .populate("group", "name description")
            .populate("splitBetween", "firstName lastName email")
            .sort({ isDefault: -1, createdAt: -1 });


        // Format the response
        const formattedTemplates = templates.map(template => {
            return {
                _id: template._id,
                name: template.name,
                description: template.description,
                amount: template.amount,
                category: template.category,
                notes: template.notes,
                splitType: template.splitType,
                direction: template.direction,
                isDefault: template.isDefault,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt,
                splitBetween: template.splitBetween ? template.splitBetween.map(user => ({
                    _id: user._id,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email
                })) : [],
                createdBy: {
                    _id: template.createdBy._id,
                    name: `${template.createdBy.firstName} ${template.createdBy.lastName}`,
                    email: template.createdBy.email
                },
                group: {
                    _id: template.group._id,
                    name: template.group.name,
                    description: template.group.description
                }
            };
        });


        res.status(200).json({
            success: true,
            templates: formattedTemplates,
            groupDetails: {
                _id: group._id,
                name: group.name,
                description: group.description,
                memberCount: group.members.length,
                members: group.members.map(member => ({
                    _id: member._id,
                    name: `${member.firstName} ${member.lastName}`,
                    email: member.email
                }))
            }
        });

    } catch (error) {
        console.error("Error in getGroupTemplates:", {
            error: error.message,
            stack: error.stack,
            groupId: req.params.groupId,
            userId: req.user._id
        });
        res.status(500).json({
            success: false,
            message: "Failed to fetch templates",
            error: error.message
        });
    }
};

const getTransactionTemplates = async (req, res) => {
};


const updateTemplate = async (req, res) => {
};

const deleteTemplate = async (req, res) => {
};


module.exports = {
    createTemplate,
    getGroupTemplates,
    getTransactionTemplates,
    updateTemplate,
    deleteTemplate
};


